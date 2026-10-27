import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const root = path.resolve('dist');
const compressible = /\.(?:html|css|js|mjs|json|svg|xml|txt|webmanifest)$/i;
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await visit(file);
    else if (compressible.test(entry.name)) {
      const data = await readFile(file);
      if (data.length < 256) continue;
      await Promise.all([
        writeFile(`${file}.br`, brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })),
        writeFile(`${file}.gz`, gzipSync(data, { level: 9 })),
      ]);
    }
  }
}
await visit(root);
console.log('Wrote Brotli and gzip sidecars for text assets.');
