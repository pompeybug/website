import assets from './lib/assets.mjs';
import { dirname } from 'path';
import drafts from '@metalsmith/drafts';
import { fileURLToPath } from 'node:url';
import layouts from '@metalsmith/layouts';
import { log } from 'console';
import markdown from '@metalsmith/markdown';
import metalsmith from 'metalsmith';
import metalsmithExpress from 'metalsmith-express';
import sitemap from 'metalsmith-sitemap';
import watch from 'metalsmith-watch';

const __dirname = dirname(fileURLToPath(import.meta.url))

const ms = metalsmith(__dirname);

ms.source('./src/articles/');
ms.clean(true);
 
// hide draft posts
ms.use(drafts( { include: false } ))

ms.use( markdown( {
    wildcard: true,
    keys: ['*.md']
}));

ms.use( layouts( {
    directory: './src/layouts',
    default: 'default.hbs'
}));

ms.use(assets({
    source: './src/style'
}));

ms.use(sitemap({           // generate a sitemap file
    hostname: "https://pompeybug.org.uk",
    omitIndex: true
}));

const serve = process.argv.includes('--serve');

if (serve) {
  log('Serving!');
  const source = __dirname + '/src';

  const config = {
      livereload: true,
      paths: {
        '${source}/**/*': true
      }
  };

  const app = metalsmithExpress();
  const watcher = watch(config);

  ms.use(app);
  ms.use(watcher);
}

ms.build(function (err) {
  if (err) {
    console.log('Borked!')
    throw err;
  }
});

console.log('Build finished!')
