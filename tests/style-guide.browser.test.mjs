import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { after, before, test } from "node:test";
import { chromium } from "playwright-core";

const require = createRequire(import.meta.url);
const base = "http://127.0.0.1:3100";
let server;
let browser;
let serverLog = "";

async function choose(page, value) {
  const radio = page.getByRole("radio", { name: value, exact: true });
  await page.locator("label").filter({ has: radio }).click({ timeout: 5000 });
  assert.equal(await radio.isChecked(), true);
  const attribute = ["day", "night"].includes(value) ? "data-theme" : "data-accent";
  await page.waitForFunction(([attribute, value]) => document.documentElement.getAttribute(attribute) === value, [attribute, value]);
}

before(async () => {
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3100"], { env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
  server.stdout.on("data", (data) => { serverLog += data; });
  server.stderr.on("data", (data) => { serverLog += data; });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(serverLog);
    try { ready = (await fetch(`${base}/style-guide`)).ok; } catch { /* Starting. */ }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, serverLog);
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
});

after(async () => {
  await browser?.close();
  server?.kill("SIGTERM");
});

test("style guide passes WCAG AA checks in all eight theme/accent combinations", async () => {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/style-guide`);
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  for (const theme of ["day", "night"]) {
    await choose(page, theme);
    assert.equal(await page.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor), theme === "day" ? "rgb(244, 241, 234)" : "rgb(14, 14, 16)");
    assert.equal(await page.locator("body").evaluate((element) => getComputedStyle(element).color), theme === "day" ? "rgb(14, 14, 16)" : "rgb(244, 241, 234)");
    for (const accent of ["petrol", "magenta", "camel", "gold"]) {
      await choose(page, accent);
      const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations);
      assert.deepEqual(violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) })), [], `${theme}/${accent}`);
    }
  }
  assert.deepEqual(errors, []);
  assert.equal(await page.locator("section[aria-labelledby='image-title'] img").count(), 7);
  for (const image of await page.locator("img").all()) await image.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
  await page.close();
});

test("initial system mood, manual preference and keyboard focus work without hydration errors", async () => {
  const context = await browser.newContext({ colorScheme: "dark", reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${base}/style-guide`);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "night");
  await choose(page, "day");
  await choose(page, "gold");
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "day");
  assert.equal(await page.locator("html").getAttribute("data-accent"), "gold");
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  assert.equal(await page.locator("html").getAttribute("data-theme"), "day");
  await page.getByRole("radio", { name: "day", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator("html").getAttribute("data-theme"), "night");
  assert.equal(await page.locator("label:has(input:focus-visible)").evaluate((element) => getComputedStyle(element).outlineStyle), "solid");
  assert.equal(await page.locator("body").evaluate((element) => getComputedStyle(element).transitionDuration), "0s");
  await context.close();
});

test("mobile layout has no overflow; homepage is absent; transitions honor motion preference", async () => {
  const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
  await page.goto(`${base}/style-guide`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  assert.equal(await page.locator("body").evaluate((element) => getComputedStyle(element).transitionDuration), "0.4s");
  assert.equal(await page.locator("nav").count(), 0);
  assert.equal((await fetch(base)).status, 404);
  await page.screenshot({ path: "/tmp/alter-style-guide-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "/tmp/alter-style-guide-desktop.png", fullPage: true });
  await page.close();
});

function heroFigure(page) {
  return page.locator("figure").filter({ has: page.getByText("hero-day-street-walk", { exact: true }) });
}

test("visible video plays and fades in, then pauses off-screen", async () => {
  const page = await browser.newPage({ reducedMotion: "no-preference", viewport: { width: 1280, height: 900 } });
  await page.goto(`${base}/style-guide`);
  await page.waitForFunction(() => document.querySelectorAll("video").length === 7);
  assert.equal(await page.locator("video").evaluateAll((elements) => elements.every((video) => video.paused)), true);
  const figure = heroFigure(page);
  await figure.scrollIntoViewIfNeeded();
  const video = figure.locator("video");
  await page.waitForFunction(() => {
    const video = document.querySelector('video[src="/video/hero-day-street-walk.mp4"]');
    return video && !video.paused && video.currentTime > 0.1 && getComputedStyle(video).opacity === "1";
  });
  const box = await figure.locator(".background-video").boundingBox();
  assert.ok(Math.abs(box.width / box.height - 16 / 9) < 0.01);
  assert.deepEqual(await video.evaluate((element) => ({ muted: element.muted, loop: element.loop, inline: element.playsInline, controls: element.controls, preload: element.preload, hidden: element.getAttribute("aria-hidden") })), { muted: true, loop: true, inline: true, controls: false, preload: "metadata", hidden: "true" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => [...document.querySelectorAll("video")].every((video) => video.paused));
  await page.close();
});

test("portrait source, poster and reserved ratio switch precisely at 768px", async () => {
  const page = await browser.newPage({ viewport: { width: 767, height: 900 }, reducedMotion: "no-preference" });
  await page.goto(`${base}/style-guide`);
  const figure = heroFigure(page);
  await figure.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('figure:has(video[src="/video/hero-day-street-walk-portrait.mp4"])'));
  const video = figure.locator("video");
  assert.equal(await video.getAttribute("src"), "/video/hero-day-street-walk-portrait.mp4");
  assert.equal(await video.getAttribute("poster"), "/video/hero-day-street-walk-portrait-poster.jpg");
  const frame = figure.locator(".background-video");
  const box = await frame.boundingBox();
  assert.ok(Math.abs(box.width / box.height - 9 / 16) < 0.01);
  await page.waitForFunction(() => [...document.images].some((image) => image.currentSrc.endsWith("/hero-day-street-walk-portrait-poster.jpg") && image.complete));
  assert.deepEqual(await frame.boundingBox(), box);
  await page.setViewportSize({ width: 768, height: 900 });
  await page.waitForFunction(() => document.querySelector('video[src="/video/hero-day-street-walk.mp4"]'));
  assert.equal(await video.getAttribute("poster"), "/video/hero-day-street-walk-poster.jpg");
  const wide = await frame.boundingBox();
  assert.ok(Math.abs(wide.width / wide.height - 16 / 9) < 0.01);
  await page.close();
});

test("reduced motion and Save-Data render posters without any MP4 requests", async () => {
  for (const preference of ["reduced-motion", "save-data"]) {
    const context = await browser.newContext({ reducedMotion: preference === "reduced-motion" ? "reduce" : "no-preference" });
    if (preference === "save-data") {
      await context.addInitScript(() => {
        const connection = new EventTarget();
        connection.saveData = true;
        Object.defineProperty(navigator, "connection", { value: connection, configurable: true });
      });
    }
    const page = await context.newPage();
    const requests = [];
    page.on("request", (request) => { if (request.url().endsWith(".mp4")) requests.push(request.url()); });
    await page.goto(`${base}/style-guide`);
    await page.getByRole("heading", { name: "A quiet rhythm." }).scrollIntoViewIfNeeded();
    const posters = page.locator("section[aria-labelledby='motion-title'] picture img");
    assert.equal(await posters.count(), 7);
    for (const poster of await posters.all()) await poster.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll(".background-video img")].every((image) => image.complete && image.naturalWidth > 0));
    assert.equal(await page.locator("video").count(), 0, preference);
    assert.deepEqual(requests, [], preference);
    if (preference === "reduced-motion") {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.waitForFunction(() => document.querySelectorAll("video").length === 7);
      await page.emulateMedia({ reducedMotion: "reduce" });
    } else {
      await page.evaluate(() => { navigator.connection.saveData = false; navigator.connection.dispatchEvent(new Event("change")); });
      await page.waitForFunction(() => document.querySelectorAll("video").length === 7);
      await page.evaluate(() => { navigator.connection.saveData = true; navigator.connection.dispatchEvent(new Event("change")); });
    }
    await page.waitForFunction(() => document.querySelectorAll("video").length === 0);
    await context.close();
  }
});

test("rejected autoplay preserves the poster without an unhandled error", async () => {
  const context = await browser.newContext({ reducedMotion: "no-preference" });
  await context.addInitScript(() => {
    window.playAttempts = 0;
    HTMLMediaElement.prototype.play = () => {
      window.playAttempts++;
      return Promise.reject(new DOMException("Autoplay blocked", "NotAllowedError"));
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/style-guide`);
  const figure = heroFigure(page);
  await figure.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.playAttempts > 0);
  assert.equal(await figure.locator("video").evaluate((video) => getComputedStyle(video).opacity), "0");
  assert.equal(await figure.locator("video").evaluate((video) => video.paused), true);
  assert.deepEqual(errors, []);
  await context.close();
});
