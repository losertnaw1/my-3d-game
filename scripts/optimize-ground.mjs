import fs from 'node:fs/promises';
import sharp from 'sharp';
import { FloatType } from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

// Offline conversion only: the browser never downloads or decodes EXR files.
const source = new URL('../public/models/forest_leaves_03_4k.blend/textures/', import.meta.url);
const output = new URL('../public/textures/ground/', import.meta.url);
const size = Number(process.argv[2] ?? 1024);
if (![512, 1024, 2048].includes(size)) throw new Error('Texture size must be 512, 1024 or 2048');
await fs.mkdir(output, { recursive: true });
const diffuse = await sharp(await fs.readFile(new URL('forest_leaves_03_diff_4k.jpg', source)))
  .resize(size, size).webp({ quality: 80 }).toBuffer();
await fs.writeFile(new URL('diffuse.webp', output), diffuse);

for (const [suffix, filename] of [['nor_gl', 'normal.png'], ['rough', 'roughness.png']]) {
  const file = await fs.readFile(new URL(`forest_leaves_03_${suffix}_4k.exr`, source));
  const exr = new EXRLoader().setDataType(FloatType).parse(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
  );
  const channels = exr.data.length / (exr.width * exr.height);
  const rgb = Buffer.alloc(exr.width * exr.height * 3);
  // EXRLoader returns bottom-up rows. PNG uses top-down rows.
  for (let y = 0; y < exr.height; y++) {
    for (let x = 0; x < exr.width; x++) {
      const src = ((exr.height - y - 1) * exr.width + x) * channels;
      const dst = (y * exr.width + x) * 3;
      for (let c = 0; c < 3; c++) {
        rgb[dst + c] = Math.round(Math.max(0, Math.min(1, exr.data[src + Math.min(c, channels - 1)])) * 255);
      }
    }
  }
  const data = await sharp(rgb, { raw: { width: exr.width, height: exr.height, channels: 3 } })
    .resize(size, size).png().toBuffer();
  await fs.writeFile(new URL(filename, output), data);
}
for (const name of ['diffuse.webp', 'normal.png', 'roughness.png']) {
  console.log(`${name}: ${((await fs.stat(new URL(name, output))).size / 1024).toFixed(0)} KiB`);
}
