import { dirname } from 'path';
import { fileURLToPath } from 'node:url';
import metalsmith from 'metalsmith';

const __dirname = dirname(fileURLToPath(import.meta.url))

const ms = metalsmith(__dirname);

ms.source('./build/');
ms.destination('./publish/');
 
ms.build(function (err) {
  if (err) {
    console.log('Borked!');
    throw err;
  }
  console.log('Contents of build folder promoted to publish folder.');
});

