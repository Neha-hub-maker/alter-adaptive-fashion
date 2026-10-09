import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import { videos, getVideos, getVideoById } from "../src/data/videos.ts";

test("all seven registered clips have unique IDs and matching readable posters", async () => {
  const files = await readdir(new URL("../public/video/", import.meta.url));
  assert.equal(videos.length, 7);
  assert.equal(new Set(videos.map((video) => video.id)).size, 7);
  assert.deepEqual(videos.map((video) => video.src.split("/").pop()).sort(), files.filter((file) => file.endsWith(".mp4")).sort());
  for (const video of videos) {
    assert.equal(video.src, `/video/${video.id}.mp4`);
    assert.equal(video.poster, `/video/${video.id}-poster.jpg`);
    assert.ok(video.durationSec > 0 && video.durationSec <= 12);
    for (const asset of [video.src, video.poster]) {
      const size = (await stat(new URL(`../public${asset}`, import.meta.url))).size;
      assert.ok(size > 0 && size < 25 * 1024 * 1024);
    }
    const poster = await sharp(new URL(`../public${video.poster}`, import.meta.url).pathname).metadata();
    assert.equal(poster.format, "jpeg");
    assert.equal(poster.width > poster.height, video.orientation === "landscape");
  }
});

test("video filters combine criteria and leave the registry intact", () => {
  assert.deepEqual(getVideos({ role: "hero", mood: "day", orientation: "portrait" }).map((video) => video.id), ["hero-day-street-walk-portrait"]);
  assert.deepEqual(getVideos({ role: "texture", mood: "night" }).map((video) => video.id), ["texture-blue-silk-loop"]);
  assert.deepEqual(getVideos({ mood: "dusk" }).map((video) => video.id), ["mood-dusk-silhouette"]);
  assert.deepEqual(getVideos({ role: "hero", mood: "night" }), []);
  assert.equal(getVideos().length, 7);
});

test("video lookup returns registered metadata and clearly rejects unknown IDs", () => {
  assert.equal(getVideoById("boutique-hands-sweaters").role, "collection");
  assert.throws(() => getVideoById("missing-clip"), /Unknown ALTER video id "missing-clip"/);
});
