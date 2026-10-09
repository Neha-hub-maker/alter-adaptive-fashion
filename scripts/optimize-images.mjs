import { mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "public/images/raw");
const destination = path.join(root, "public/images/optimized");
const widths = [800, 1400, 2200];
const files = (await readdir(source)).filter((file) => /\.jpe?g$/i.test(file)).sort();
if (!files.length) throw new Error(`No JPEG source images found in ${source}`);
await mkdir(destination, { recursive: true });

// Sequential images and limited libvips concurrency keep peak memory modest.
sharp.concurrency(2);
for (const file of files) {
  for (const width of widths) {
    const output = `${path.parse(file).name}-${width}.webp`;
    await sharp(path.join(source, file))
      .rotate()
      .resize({ width })
      .webp({ quality: 82, effort: 5 })
      .toFile(path.join(destination, output));
  }
  console.log(`Optimized ${file}: ${widths.join(', ')}px`);
}
console.log(`Created ${files.length * widths.length} WebP variants.`);
