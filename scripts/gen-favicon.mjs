// One-off script to rasterize public/icon.svg into the favicon file set
// required by the MP branding rule (see mp-app-kit/BRANDING.md).
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pngToIco from 'png-to-ico';

const svgPath = fileURLToPath(new URL('../public/icon.svg', import.meta.url));

async function main() {
  const sizes = [16, 32, 192, 512];
  const buffers = {};
  for (const size of sizes) {
    const buf = await sharp(svgPath, { density: 384 }).resize(size, size).png().toBuffer();
    buffers[size] = buf;
    if (size === 32 || size === 192 || size === 512) {
      writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), buf);
      console.log(`Wrote icon-${size}.png`);
    }
  }

  const icoBuffer = await pngToIco([buffers[16], buffers[32]]);
  writeFileSync(new URL('../public/favicon.ico', import.meta.url), icoBuffer);
  console.log('Wrote favicon.ico');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
