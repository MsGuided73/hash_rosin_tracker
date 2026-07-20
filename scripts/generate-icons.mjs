// Generate the PWA icon set from the SVG sources.
// Run: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const iconsDir = path.join(root, 'public', 'icons');
const src = path.join(iconsDir, 'icon.svg');
const srcMaskable = path.join(iconsDir, 'icon-maskable.svg');

const jobs = [
  { input: src, size: 192, out: 'icon-192.png' },
  { input: src, size: 512, out: 'icon-512.png' },
  { input: srcMaskable, size: 192, out: 'maskable-192.png' },
  { input: srcMaskable, size: 512, out: 'maskable-512.png' },
  { input: src, size: 180, out: 'apple-touch-icon.png' },
  { input: src, size: 64, out: 'favicon-64.png' },
];

await mkdir(iconsDir, { recursive: true });
for (const { input, size, out } of jobs) {
  await sharp(input, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(path.join(iconsDir, out));
  console.log(`✓ ${out} (${size}x${size})`);
}
