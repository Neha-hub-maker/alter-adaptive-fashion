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
  const radio = page.locator("section[aria-labelledby='mood-title']").getByRole("radio", { name: new RegExp(`^${value}$`, "i") });
  await radio.locator("..").click({ timeout: 5000 });
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

test("initial demo/auto mood, manual preference and keyboard focus work without hydration errors", async () => {
  const context = await browser.newContext({ colorScheme: "dark", reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${base}/style-guide?hour=19`);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "night");
  await choose(page, "day");
  await choose(page, "gold");
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "day");
  assert.equal(await page.locator("html").getAttribute("data-accent"), "gold");
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  assert.equal(await page.locator("html").getAttribute("data-theme"), "day");
  await page.locator("section[aria-labelledby='mood-title']").getByRole("radio", { name: "Day", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator("html").getAttribute("data-theme"), "night");
  assert.equal(await page.locator("label:has(input:focus-visible)").evaluate((element) => getComputedStyle(element).outlineStyle), "solid");
  assert.equal(await page.locator("body").evaluate((element) => getComputedStyle(element).transitionDuration), "0s");
  await context.close();
});

test("mobile style guide has no overflow and retains theme transitions alongside site navigation", async () => {
  const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
  await page.goto(`${base}/style-guide`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  assert.equal(await page.locator("body").evaluate((element) => getComputedStyle(element).transitionDuration), "0.4s");
  assert.equal(await page.getByRole("button", { name: "Menu", exact: true }).count(), 1);
  assert.equal((await fetch(base)).status, 200);
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

test("auto advances across both hour boundaries and manual moods remain in control", async () => {
  const context = await browser.newContext({ timezoneId: "UTC", reducedMotion: "reduce", colorScheme: "dark" });
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-10-09T05:59:00Z") });
  await page.goto(`${base}/`);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "night");
  await page.clock.runFor(60_000);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "day");
  await page.clock.setSystemTime(new Date("2026-10-09T17:59:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.clock.runFor(60_000);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "night");
  const header = page.locator("header");
  await header.getByRole("radio", { name: "Day", exact: true }).locator("..").click();
  assert.equal(await page.evaluate(() => localStorage.getItem("alter-theme")), "day");
  await page.clock.runFor(60_000);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "day");
  await header.getByRole("radio", { name: "Auto", exact: true }).locator("..").click();
  assert.equal(await page.evaluate(() => localStorage.getItem("alter-theme")), null);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "night");
  assert.equal(await page.locator(".hero-content time").textContent(), "18:01");
  await context.close();
});

test("demo hour applies before hydration; invalid demo values and storage denial are safe", async () => {
  for (const [query, expected] of [["?hour=19", "night"], ["?hour=6", "day"], ["?hour=24", "day"], ["?hour=-1", "day"], ["?hour=6.5", "day"]]) {
    const context = await browser.newContext({ timezoneId: "UTC", reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.clock.install({ time: new Date("2026-10-09T09:00:00Z") });
    // Block hydration scripts while allowing the inline before-paint bootstrap.
    await page.route("**/_next/**", (route) => route.request().resourceType() === "script" ? route.abort() : route.continue());
    await page.goto(`${base}/${query}`);
    assert.equal(await page.locator("html").getAttribute("data-theme"), expected);
    assert.equal(await page.locator(`.hero-layer-${expected}`).evaluate((element) => getComputedStyle(element).opacity), "1");
    await context.close();
  }
  const context = await browser.newContext({ reducedMotion: "reduce" });
  await context.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"]) Storage.prototype[method] = () => { throw new Error("Storage denied"); };
  });
  const page = await context.newPage();
  await page.goto(`${base}/?hour=19`);
  const header = page.locator("header");
  for (const [mode, expected] of [["Day", "day"], ["Auto", "night"], ["Night", "night"]]) {
    await header.getByRole("radio", { name: mode, exact: true }).locator("..").click();
    assert.equal(await page.locator("html").getAttribute("data-theme"), expected);
  }
  await context.close();
});

test("mobile menu traps keyboard focus, closes with Escape, restores focus and unlocks scrolling", async () => {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
  await page.goto(`${base}/?hour=9`);
  await page.keyboard.press("Tab");
  assert.equal(await page.getByRole("link", { name: "Skip to content" }).evaluate((element) => document.activeElement === element), true);
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("main").evaluate((element) => document.activeElement === element), true);
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  await menu.focus();
  await page.keyboard.press("Enter");
  const panel = page.getByRole("dialog");
  await panel.waitFor({ state: "visible" });
  assert.equal(await menu.getAttribute("aria-expanded"), "true");
  assert.equal(await menu.getAttribute("aria-controls"), await panel.getAttribute("id"));
  assert.equal(await page.locator("body").evaluate((element) => element.style.overflow), "hidden");
  const close = panel.getByRole("button", { name: "Close menu" });
  assert.equal(await close.evaluate((element) => document.activeElement === element), true);
  await page.keyboard.press("Shift+Tab");
  assert.equal(await panel.getByRole("radio", { name: "Auto", exact: true }).evaluate((element) => document.activeElement === element), true);
  await page.keyboard.press("ArrowRight");
  assert.equal(await panel.getByRole("radio", { name: "Day", exact: true }).isChecked(), true);
  await page.keyboard.press("Tab");
  assert.equal(await close.evaluate((element) => document.activeElement === element), true);
  await page.keyboard.press("Tab");
  assert.equal(await panel.getByRole("link", { name: "Collection", exact: true }).evaluate((element) => document.activeElement === element), true);
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations);
  assert.deepEqual(violations.map((item) => item.id), []);
  await page.keyboard.press("Escape");
  assert.equal(await menu.getAttribute("aria-expanded"), "false");
  assert.equal(await menu.evaluate((element) => document.activeElement === element), true);
  assert.equal(await page.locator("body").evaluate((element) => element.style.overflow), "");
  await menu.click();
  await panel.getByRole("link", { name: "Collection", exact: true }).click();
  await page.waitForFunction(() => location.hash === "#collection");
  assert.equal(await page.locator("dialog").evaluate((element) => element.open), false);
  assert.equal(await page.locator("body").evaluate((element) => element.style.overflow), "");
  await page.close();
});

test("homepage themes remain accessible, use the requested media and switch instantly under reduced motion", async () => {
  for (const [hour, mood] of [[9, "day"], [19, "night"]]) {
    const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } });
    const requests = [];
    const errors = [];
    page.on("request", (request) => { if (request.url().endsWith(".mp4")) requests.push(request.url()); });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/?hour=${hour}`);
    assert.equal(await page.title(), "ALTER - Dress for the hour you're in.");
    assert.equal(await page.locator("html").getAttribute("data-theme"), mood);
    assert.equal(await page.locator("video").count(), 0);
    assert.equal(await page.locator(".hero-layer").first().evaluate((element) => getComputedStyle(element).transitionDuration), "0s");
    assert.equal(await page.getByRole("link", { name: "Explore the collection" }).getAttribute("href"), "#collection");
    assert.equal(await page.getByRole("link", { name: "Our story", exact: true }).getAttribute("href"), "#story");
    assert.ok(await page.locator(".hero-layer-night .hero-night-photo img").getAttribute("src").then((src) => src.includes("street-night-allwhite")));
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations);
    assert.deepEqual(violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) })), []);
    assert.deepEqual(requests, []);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `/tmp/alter-home-${mood}.png`, fullPage: true });
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
  await page.goto(`${base}/?hour=9`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: "/tmp/alter-home-mobile.png", fullPage: true });
  await page.close();
});

test("hero crossfades over 600ms and only the active mood video plays", async () => {
  const page = await browser.newPage({ reducedMotion: "no-preference", viewport: { width: 1440, height: 1000 } });
  await page.goto(`${base}/?hour=9`);
  await page.waitForFunction(() => {
    const day = document.querySelector('.hero-layer-day video');
    const night = document.querySelector('.hero-layer-night video');
    return day && night && !day.paused && day.currentTime > 0 && night.paused;
  });
  assert.equal(await page.locator(".hero-layer").first().evaluate((element) => getComputedStyle(element).transitionDuration), "0.6s");
  const header = page.locator("header");
  await header.getByRole("radio", { name: "Night", exact: true }).locator("..").click();
  await page.waitForFunction(() => {
    const day = document.querySelector('.hero-layer-day video');
    const night = document.querySelector('.hero-layer-night video');
    return day.paused && !night.paused && night.currentTime > 0;
  });
  assert.equal(await page.locator(".hero-layer-night video").getAttribute("src"), "/video/texture-blue-silk-loop.mp4");
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".hero-layer-night")).opacity === "1");
  await page.close();
});
