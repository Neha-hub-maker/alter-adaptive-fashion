import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import { getImages, images, imageCategories, optimizedImagePath } from "../src/data/images.ts";

test("metadata covers every original image exactly once", async () => {
  const raw = await readdir(new URL("../public/images/raw/", import.meta.url));
  assert.equal(images.length, 16);
  assert.deepEqual(images.map((image) => image.file).sort(), raw.filter((file) => file.endsWith(".jpg")).sort());
  assert.equal(new Set(images.map((image) => image.file)).size, 16);
  for (const category of imageCategories) assert.ok(getImages({ category }).length > 0);
  for (const image of images) assert.ok(image.alt.length > 30);
});

test("filters combine category, mood and branding without mutating the catalog", () => {
  assert.deepEqual(getImages({ category: "street", mood: "day" }).map((image) => image.file), ["street-navy-coat-magenta.jpg", "day-blazer-yucca.jpg"]);
  assert.deepEqual(getImages({ category: "model", mood: "night", excludeBranded: true }).map((image) => image.file), ["model-dark-mirror.jpg"]);
  assert.equal(getImages({ excludeBranded: true }).length, 13);
  assert.deepEqual(getImages({ category: "product", excludeBranded: true }), []);
  assert.equal(getImages().length, 16);
});

test("all 48 generated images are readable WebP files at the requested widths", async () => {
  for (const image of images) {
    for (const width of [800, 1400, 2200]) {
      const url = new URL(`../public${optimizedImagePath(image.file, width)}`, import.meta.url);
      const metadata = await sharp(url.pathname).metadata();
      assert.equal(metadata.format, "webp");
      assert.equal(metadata.width, width);
      assert.ok(metadata.height > 0);
    }
  }
});
