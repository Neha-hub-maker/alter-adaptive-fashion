import assert from "node:assert/strict";
import { test } from "node:test";
import { images } from "../src/data/images.ts";
import { videos } from "../src/data/videos.ts";
import { imageCredits, videoCredits } from "../src/data/credits.ts";
import { getSiteUrl, indexingAllowed, robotsPolicy, crawlerRules, sitemapEntries, pageMetadata } from "../src/lib/seo.ts";

test("all registered images, videos and poster stills have unique supplied credits", () => {
  assert.deepEqual(imageCredits.map((c) => c.file).sort(), images.map((i) => i.file).sort());
  assert.deepEqual(videoCredits.map((c) => c.file).sort(), videos.map((v) => v.src).sort());
  assert.deepEqual(videoCredits.map((c) => c.poster).sort(), videos.map((v) => v.poster).sort());
  assert.equal(new Set(imageCredits.map((c) => c.file)).size, 16);
  assert.equal(new Set(videoCredits.map((c) => c.pexelsId)).size, 7);
  assert.ok(videoCredits.every((c) => c.creator === "to be added by the site owner"));
  assert.equal(images.find((i) => i.file === "editorial-bw-suit.jpg").thirdPartyBranding, false);
});

test("fictional site is noindex by default; exact opt-in lists only public indexable routes", () => {
  const base = new URL("https://alter.example");
  for (const value of [undefined, "", "false", "TRUE", "1"]) assert.equal(indexingAllowed(value), false);
  assert.equal(indexingAllowed("true"), true);
  assert.deepEqual(robotsPolicy(false), { index: false, follow: false });
  assert.deepEqual(crawlerRules(false, base), { rules: { userAgent: "*", disallow: "/" } });
  assert.deepEqual(sitemapEntries(false, base), []);
  assert.deepEqual(robotsPolicy(true), { index: true, follow: true });
  assert.equal(crawlerRules(true, base).rules.disallow, "/style-guide");
  assert.deepEqual(sitemapEntries(true, base).map((v) => v.url), ["https://alter.example/", "https://alter.example/credits"]);
});

test("canonical origin prioritizes explicit site URL and shares metadata without guessing a deployment", () => {
  assert.equal(getSiteUrl("https://example.com/subpath", "other.vercel.app").href, "https://example.com/");
  assert.equal(getSiteUrl("", "alter.vercel.app").href, "https://alter.vercel.app/");
  assert.equal(getSiteUrl("", "").href, "https://alter.example/");
  assert.throws(() => getSiteUrl("https://user:secret@example.com"), /without credentials/);
  assert.throws(() => getSiteUrl("file:///tmp/example"), /HTTP/);
  const meta = pageMetadata("Credits", "/credits");
  assert.equal(meta.alternates.canonical, "/credits");
  assert.equal(meta.twitter.card, "summary_large_image");
  assert.equal(meta.openGraph.images[0].width, 1200);
  assert.equal(meta.openGraph.images[0].height, 630);
});
