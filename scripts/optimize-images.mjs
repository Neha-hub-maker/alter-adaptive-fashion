import { mkdir, readdir, stat } from "node:fs/promises";
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
let created = 0;
let skipped = 0;
for (const file of files) {
  const sourcePath = path.join(source, file);
  const sourceInfo = await stat(sourcePath);
  const generatedWidths = [];
  for (const width of widths) {
    const output = `${path.parse(file).name}-${width}.webp`;
    const outputPath = path.join(destination, output);
    let outputInfo;
    try {
      outputInfo = await stat(outputPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (outputInfo?.mtimeMs > sourceInfo.mtimeMs) {
      skipped++;
      continue;
    }
    await sharp(sourcePath)
      .rotate()
      .resize({ width })
      .webp({ quality: 82, effort: 5 })
      .toFile(outputPath);
    created++;
    generatedWidths.push(width);
  }
  if (generatedWidths.length) console.log(`Optimized ${file}: ${generatedWidths.join(', ')}px`);
}
console.log(`Created ${created} WebP variants; skipped ${skipped} fresh variants.`);
