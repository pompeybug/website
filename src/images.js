// Resized copies of images, made on first request and kept on disk.
// ?w=<width> gives a WebP no wider than that; ?og=1 gives the 1200x630 JPEG
// used when a page is shared. sharp is held to one image at a time so a burst
// of requests cannot use more memory than the server has spare.

import { mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

sharp.cache(false);
sharp.concurrency(1);

const WIDTHS = [160, 320, 500, 800, 1200, 1600];
const RASTER = /\.(jpe?g|png|webp|avif)$/i;
const YEAR = 60 * 60 * 24 * 365;

export const wantsResize = (req) => RASTER.test(req.path) && (req.query.w !== undefined || req.query.og !== undefined);

let line = Promise.resolve();
const oneAtATime = (task) => {
  const next = line.then(task, task);
  line = next.catch(() => {});
  return next;
};

export function createResizer(cacheDir) {
  return async function sendResized(req, res, source) {
    const og = req.query.og !== undefined;
    const asked = Number(req.query.w);
    const width = WIDTHS.find((w) => w >= asked) ?? WIDTHS.at(-1);
    const variant = og ? 'og.jpg' : `${width}.webp`;
    const name = `${createHash('sha256').update(`${source.file}:${source.mtimeMs}`).digest('hex').slice(0, 24)}-${variant}`;
    const cached = path.join(cacheDir, name);

    if (!existsSync(cached)) {
      await oneAtATime(async () => {
        if (existsSync(cached)) return;
        await mkdir(cacheDir, { recursive: true });
        const tmp = `${cached}.${process.pid}.tmp`;
        const image = sharp(source.file, { limitInputPixels: 60_000_000 }).rotate();
        if (og) await image.resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 82 }).toFile(tmp);
        else await image.resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toFile(tmp);
        await rename(tmp, cached);
      });
    }
    res.set('Cache-Control', `public, max-age=${YEAR}, immutable`);
    res.type(og ? 'jpeg' : 'webp').sendFile(cached);
  };
}

// Uploads are normalised once so nobody has to think about file sizes:
// photos become JPEGs no larger than 2400px, with phone rotation applied.
export async function prepareUpload(buffer) {
  const image = sharp(buffer, { limitInputPixels: 60_000_000 }).rotate();
  const { format, hasAlpha } = await image.metadata();
  if (!['jpeg', 'png', 'webp', 'heif', 'avif', 'gif', 'tiff'].includes(format)) return null;
  const resized = image.resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true });
  if (format === 'png' && hasAlpha) return { buffer: await resized.png({ compressionLevel: 9 }).toBuffer(), extension: 'png' };
  return { buffer: await resized.jpeg({ quality: 86, mozjpeg: true }).toBuffer(), extension: 'jpg' };
}
