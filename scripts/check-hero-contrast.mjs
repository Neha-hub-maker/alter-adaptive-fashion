// Optional design audit; requires ffmpeg on PATH. Generated frames stay temporary.
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

const workspace = await mkdtemp(path.join(tmpdir(), "alter-contrast-"));
const luminance = (rgb) => rgb.map((value) => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
const ink = [14, 14, 16];
const ivory = [244, 241, 234];
const rows = [];
try {
  for (const [id, mood] of [["hero-day-street-walk", "day"], ["hero-day-street-walk-portrait", "day"], ["texture-blue-silk-loop", "night"]]) {
    for (const sample of ["poster", 1, 4, 8]) {
      let file = `public/video/${id}-poster.jpg`;
      if (sample !== "poster") {
        file = path.join(workspace, `${id}-${sample}.png`);
        execFileSync("ffmpeg", ["-loglevel", "error", "-ss", String(sample), "-i", `public/video/${id}.mp4`, "-frames:v", "1", "-y", file]);
      }
      const { data, info } = await sharp(file).removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
      const overlay = mood === "day" ? ivory : ink;
      const foreground = luminance(mood === "day" ? ink : ivory);
      const alpha = mood === "day" ? 0.9 : 0.72;
      let min = Infinity;
      for (let i = 0; i < data.length; i += info.channels) {
        const background = luminance(overlay.map((channel, index) => channel * alpha + data[i + index] * (1 - alpha)));
        const ratio = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
        min = Math.min(min, ratio);
      }
      rows.push({ id, sample, minimumRatio: Number(min.toFixed(2)) });
    }
  }
  console.log(JSON.stringify(rows, null, 2));
} finally { await rm(workspace, { recursive: true, force: true }); }
