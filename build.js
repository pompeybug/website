import assets from './lib/assets.mjs';
import { dirname } from 'path';
import drafts from '@metalsmith/drafts';
import { fileURLToPath } from 'node:url';
import layouts from '@metalsmith/layouts';
import markdown from '@metalsmith/markdown';
import metalsmith from 'metalsmith';
import sitemap from 'metalsmith-sitemap';

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

ms.build(function (err) {
  if (err) {
    console.log('Borked!')
    throw err;
  }
});

console.log('Build finished!')
