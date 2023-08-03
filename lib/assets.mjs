import Mode from 'stat-mode';
import async from 'async';
import debug from 'debug';
import fs from 'fs';
import path from 'path';
import readdir from 'recursive-readdir';

/**
 * Default plugin options
 */
const defaults = {
  source: './src/assets',
  destination: '.'
};

/**
 * Metalsmith plugin to copy assets from source to dest.
 *
 * @param {Object} options (optional)
 *   @property {String} source Path to copy static assets from (relative to working directory). Defaults to './src/assets'
 *   @property {String} destination Path to copy static assets to (relative to destination directory). Defaults to '.'
 * @return {Function}
 */
 export default function assets(options) {
  options = {...defaults, ...options};

  return function (files, metalsmith, done) {
    const src = metalsmith.path(options.source);
    const dest = options.destination;

    // copied almost line for line from https://github.com/segmentio/metalsmith/blob/master/lib/index.js
    readdir(src, function (err, arr) {
      if (err) return done(err);

      debug(arr.length+' files found.');

      async.each(arr, read, function (err) {
        debug(arr.length+' files copied.');
        done(err, files);
      });
    });

    function read(file, done) {
      const name = path.join(dest, path.relative(src, file));
      fs.stat(file, function (err, stats) {
        if (err) return done(err);
        fs.readFile(file, function (err, buffer) {
          if (err) return done(err);
          const file = {};

          file.contents = buffer;

          file.mode = Mode(stats).toOctal();
          files[name] = file;
          done();
        });
      });
    }
  };
}