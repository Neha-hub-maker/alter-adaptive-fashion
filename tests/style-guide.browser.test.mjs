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

test("mobile style guide has no overflow and keeps site navigation without animating colours", async () => {
  const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
  await page.goto(`${base}/style-guide`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  assert.equal(await page.locator("body").evaluate((element) => getComputedStyle(element).transitionDuration), "0.4s");
  assert.equal(await page.locator("body").evaluate((element) => getComputedStyle(element).transitionProperty), "none");
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
  await figure.locator(".background-video").evaluate((element) => element.scrollIntoView({ block: "center" }));
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
  await figure.locator(".background-video").evaluate((element) => element.scrollIntoView({ block: "center" }));
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

test("collection filters combine, announce results and retain the active edit's stable order", async () => {
  const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/?hour=9#collection`);
  const collection = page.locator("#collection");
  const cards = collection.getByRole("button", { name: /^Quick view:/ });
  await page.waitForFunction(() => document.querySelector(".product-card-button")?.getAttribute("aria-label") === "Quick view: Meridian Overcoat");
  assert.equal(await cards.count(), 9);
  assert.equal(await collection.getByRole("status").textContent(), "9 pieces");
  assert.match(await collection.innerText(), /Day edit leads/i);
  const originalDayOrder = await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute("aria-label")));
  assert.deepEqual(originalDayOrder.slice(0, 4), ["Meridian Overcoat", "Daylight Check Blazer", "Column Trouser", "Pearl & Gold Jewellery Edit"].map((name) => `Quick view: ${name}`));
  await page.locator("header").getByRole("radio", { name: "Night", exact: true }).locator("..").click();
  await page.waitForFunction(() => document.querySelector(".product-card-button")?.getAttribute("aria-label") === "Quick view: Nocturne Leather Jacket");
  assert.deepEqual((await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute("aria-label")))).slice(0, 5), ["Nocturne Leather Jacket", "Rue Leather Overshirt", "Hush Longline Coat", "Studio Blazer", "Midnight Ivory Set"].map((name) => `Quick view: ${name}`));
  assert.match(await collection.innerText(), /Night edit leads/i);

  const moods = collection.getByRole("group", { name: "Mood", exact: true });
  const categories = collection.getByRole("group", { name: "Category", exact: true });
  await moods.getByRole("button", { name: "Day edit", exact: true }).focus();
  await page.keyboard.press("Enter");
  assert.equal(await cards.count(), 4);
  assert.equal(await moods.getByRole("button", { name: "Day edit" }).getAttribute("aria-pressed"), "true");
  assert.equal(await moods.getByRole("button", { name: "Day edit" }).evaluate((element) => getComputedStyle(element).outlineStyle), "solid");
  await categories.getByRole("button", { name: /^outerwear$/i }).click();
  assert.equal(await collection.getByRole("status").textContent(), "1 piece");
  assert.equal(await cards.first().getAttribute("aria-label"), "Quick view: Meridian Overcoat");
  await moods.getByRole("button", { name: "Night edit" }).click();
  assert.equal(await collection.getByRole("status").textContent(), "3 pieces");
  await categories.getByRole("button", { name: /^accessories$/i }).click();
  assert.equal(await cards.count(), 0);
  assert.equal(await collection.getByRole("status").textContent(), "0 pieces");
  assert.equal(await collection.getByRole("heading", { name: "No pieces in this edit." }).isVisible(), true);
  await collection.getByRole("button", { name: "Clear filters" }).click();
  assert.equal(await cards.count(), 9);
  assert.equal(await moods.getByRole("button", { name: "All", exact: true }).evaluate((element) => document.activeElement === element), true);
  assert.equal(await categories.getByRole("button", { name: "All", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal(await cards.first().getAttribute("aria-label"), "Quick view: Nocturne Leather Jacket");
  assert.equal(await cards.first().evaluate((element) => getComputedStyle(element).transitionDuration), "0s");
  assert.equal(await collection.locator("img").evaluateAll((elements) => elements.every((image) => image.loading === "lazy" && decodeURIComponent(image.getAttribute("src")).includes("/images/optimized/"))), true);
  assert.deepEqual(errors, []);
  await collection.screenshot({ path: "/tmp/alter-collection-night.png" });
  await page.close();
});

test("quick view handles keyboard focus, required sizes, additions, persistence and dismissal", async () => {
  const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } });
  await page.goto(`${base}/?hour=9#collection`);
  const card = page.getByRole("button", { name: "Quick view: Studio Blazer", exact: true });
  await card.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Studio Blazer", exact: true });
  await dialog.waitFor({ state: "visible" });
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  const add = dialog.getByRole("button", { name: "Add to bag", exact: true });
  assert.equal(await close.evaluate((element) => document.activeElement === element), true);
  assert.equal(await page.locator("body").evaluate((element) => element.style.overflow), "hidden");
  await page.keyboard.press("Shift+Tab");
  assert.equal(await add.evaluate((element) => document.activeElement === element), true);
  await page.keyboard.press("Tab");
  assert.equal(await close.evaluate((element) => document.activeElement === element), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".quick-view").count(), 0);
  assert.equal(await card.evaluate((element) => document.activeElement === element), true);
  assert.equal(await page.locator("body").evaluate((element) => element.style.overflow), "");

  await card.click();
  await add.click();
  assert.equal(await dialog.getByRole("alert").textContent(), "Choose a size before adding to your bag.");
  const sizes = dialog.getByRole("group", { name: "Size (required)", exact: true });
  assert.equal(await sizes.evaluate((element) => document.activeElement === element), true);
  assert.equal(await sizes.getAttribute("aria-invalid"), "true");
  assert.equal(await page.locator("header").getByText("Bag (0)", { exact: true }).count(), 1);
  await sizes.getByRole("radio", { name: "M", exact: true }).focus();
  await page.keyboard.press("Space");
  await dialog.getByRole("group", { name: "Colour", exact: true }).getByRole("radio", { name: "Ivory", exact: true }).locator("..").click();
  assert.equal(await dialog.getByRole("alert").count(), 0);
  await add.click();
  assert.equal(await dialog.locator("[aria-live='polite']").textContent(), "Added: Studio Blazer, size M");
  assert.equal(await page.locator("header").getByText("Bag (1)", { exact: true }).count(), 1);
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("alter-bag"))), { version: 1, count: 1, items: [{ productId: "studio-blazer", size: "M", colorToken: "ivory" }] });
  await add.click();
  assert.equal(await page.locator("header").getByText("Bag (2)", { exact: true }).count(), 1);
  await dialog.screenshot({ path: "/tmp/alter-quick-view-desktop.png" });
  await close.click();
  assert.equal(await card.evaluate((element) => document.activeElement === element), true);
  await card.click();
  assert.equal(await sizes.getByRole("radio").evaluateAll((elements) => elements.every((element) => !element.checked)), true);
  await page.mouse.click(16, 16); // Outside the desktop dialog's bounds: backdrop.
  assert.equal(await page.locator(".quick-view").count(), 0);
  assert.equal(await card.evaluate((element) => document.activeElement === element), true);
  assert.equal(await page.locator("body").evaluate((element) => element.style.overflow), "");
  await page.reload();
  await page.waitForFunction(() => document.querySelector("header")?.textContent.includes("Bag (2)"));
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("alter-bag")).items.length), 2);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "ALTER / Menu", exact: true });
  assert.equal(await menu.getByRole("button", { name: "Bag (2)", exact: true }).isVisible(), true);
  await menu.getByRole("button", { name: "Bag (2)", exact: true }).click();
  assert.equal(await page.locator("body").evaluate((element) => element.style.overflow), "");
  assert.equal(await page.getByRole("button", { name: "Menu", exact: true }).getAttribute("aria-expanded"), "false");
  await page.close();
});

test("collection geometry, stock images and mobile quick views remain accessible in both moods", async () => {
  for (const [hour, mood] of [[9, "day"], [19, "night"]]) {
    const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } });
    await page.goto(`${base}/?hour=${hour}#collection`);
    await page.waitForFunction((mood) => document.querySelector("#collection .label") && document.documentElement.dataset.theme === mood && document.querySelector("#collection")?.textContent.includes(`${mood === "day" ? "Day" : "Night"} edit leads`), mood);
    const collection = page.locator("#collection");
    const grid = collection.locator(".collection-grid");
    const imageBoxes = collection.locator(".product-card-image");
    const first = await imageBoxes.nth(0).boundingBox();
    const next = await imageBoxes.nth(1).boundingBox();
    assert.ok(Math.abs(first.width - (next.width * 2 + 32)) < 1);
    assert.ok(Math.abs(first.width / first.height - 4 / 5) < 0.01);
    for (const image of await collection.locator("img").all()) await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll("#collection img")].every((image) => image.complete && image.naturalWidth > 0));
    await collection.screenshot({ path: `/tmp/alter-collection-${mood}.png` });
    await page.setViewportSize({ width: 768, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `tablet ${mood}`);
    assert.equal(await collection.locator(".product-card").first().evaluate((element) => getComputedStyle(element).gridColumnEnd), "span 4");
    await page.setViewportSize({ width: 320, height: 812 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `small mobile ${mood}`);
    assert.equal(await collection.locator(".product-card").first().evaluate((element) => getComputedStyle(element).gridColumnEnd), "span 6");
    await page.setViewportSize({ width: 375, height: 812 });
    assert.equal(await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length), 12);
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations);
    assert.deepEqual(violations.map((item) => ({ id: item.id, targets: item.nodes.map((node) => node.target) })), [], mood);
    await collection.getByRole("button", { name: /^Quick view:/ }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
    const bounds = await dialog.boundingBox();
    assert.equal(bounds.width, 375);
    assert.equal(bounds.height, 812);
    assert.equal(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth), true);
    await page.screenshot({ path: `/tmp/alter-quick-view-mobile-${mood}.png` });
    await dialog.getByRole("button", { name: "Add to bag" }).click();
    const dialogViolations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations);
    assert.deepEqual(dialogViolations.map((item) => ({ id: item.id, targets: item.nodes.map((node) => node.target) })), [], `dialog ${mood}`);
    const scrollPosition = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 500);
    assert.equal(await page.evaluate(() => window.scrollY), scrollPosition);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".quick-view").count(), 0);
    await page.close();
  }
});

test("bag works with denied or malformed storage and derives restored count from valid items", async () => {
  for (const [scenario, initialCount] of [["denied", 0], ["malformed", 0], ["invalid-items", 1]]) {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 375, height: 812 } });
    await context.addInitScript((scenario) => {
      if (scenario === "denied") {
        for (const method of ["getItem", "setItem", "removeItem"]) Storage.prototype[method] = () => { throw new Error("Storage denied"); };
      } else {
        localStorage.setItem("alter-bag", scenario === "malformed" ? "{" : JSON.stringify({ version: 1, count: 999, items: [{ productId: "unknown", size: "M", colorToken: "ink" }, { productId: "pearl-gold-jewellery-edit", size: "One size", colorToken: "gold" }] }));
      }
    }, scenario);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}/?hour=9#collection`);
    await page.waitForFunction((count) => document.querySelector("header")?.textContent.includes(`Bag (${count})`), initialCount);
    await page.getByRole("button", { name: "Quick view: Pearl & Gold Jewellery Edit", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: "One size", exact: true }).locator("..").click();
    await dialog.getByRole("button", { name: "Add to bag" }).click();
    assert.equal(await page.locator("header").getByText(`Bag (${initialCount + 1})`, { exact: true }).count(), 1);
    assert.equal(await dialog.locator("[aria-live='polite']").textContent(), "Added: Pearl & Gold Jewellery Edit, size One size");
    await dialog.getByRole("button", { name: "Add to bag" }).click();
    assert.equal(await page.locator("header").getByText(`Bag (${initialCount + 2})`, { exact: true }).count(), 1);
    assert.deepEqual(errors, [], scenario);
    await context.close();
  }
});

test("dusk waits until the midpoint, coalesces rapid choices and never runs on initial load or the guide", async () => {
  const page = await browser.newPage({ reducedMotion: "no-preference", viewport: { width: 1440, height: 1000 } });
  const requests = [];
  page.on("request", (request) => { if (request.url().includes("mood-dusk-silhouette.mp4")) requests.push(request.url()); });
  await page.goto(`${base}/?hour=9`);
  await page.getByRole("button", { name: "Motion: On", exact: true }).waitFor();
  assert.equal(await page.locator(".dusk-transition").getAttribute("data-active"), "false");
  assert.deepEqual(requests, []);
  const header = page.locator("header");
  const chooseMood = async (name) => header.getByRole("radio", { name, exact: true }).locator("..").click();
  const start = await page.evaluate(() => performance.now());
  await chooseMood("Night");
  assert.equal(await page.locator("html").getAttribute("data-theme"), "day");
  const overlay = page.locator(".dusk-transition");
  assert.equal(await overlay.getAttribute("aria-hidden"), "true");
  assert.equal(await overlay.evaluate((element) => getComputedStyle(element).pointerEvents), "none");
  await chooseMood("Day");
  await chooseMood("Night");
  assert.equal(await page.locator(".dusk-video").count(), 1);
  await page.waitForFunction(() => document.documentElement.dataset.theme === "night");
  const midpoint = await page.evaluate(() => performance.now());
  assert.ok(midpoint - start >= 500 && midpoint - start < 1100);
  // A late choice uses the existing fade-out window instead of starting a stack.
  await chooseMood("Day");
  await page.waitForFunction(() => document.documentElement.dataset.theme === "day");
  await page.waitForFunction(() => document.querySelector(".dusk-transition").dataset.active === "false");
  assert.ok((await page.evaluate(() => performance.now())) - start < 1500);
  assert.equal(await page.locator(".dusk-video").count(), 0);
  assert.equal(await header.getByRole("radio", { name: "Day", exact: true }).evaluate((element) => document.activeElement === element), true);
  await page.goto(`${base}/style-guide`);
  await choose(page, "night");
  assert.equal(await overlay.getAttribute("data-active"), "false");
  await page.close();
});

test("dusk switches at an auto hour boundary and completes even when its video fails", async () => {
  const page = await browser.newPage({ reducedMotion: "no-preference", timezoneId: "UTC" });
  await page.route("**/mood-dusk-silhouette.mp4", (route) => route.abort());
  await page.clock.install({ time: new Date("2026-10-10T17:59:00Z") });
  await page.clock.pauseAt(new Date("2026-10-10T17:59:10Z"));
  await page.goto(base);
  await page.getByRole("button", { name: "Motion: On", exact: true }).waitFor();
  await page.clock.fastForward(50_000);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "day");
  assert.equal(await page.locator(".dusk-transition").getAttribute("data-active"), "true");
  await page.clock.runFor(600);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "night");
  await page.clock.runFor(650);
  assert.equal(await page.locator(".dusk-transition").getAttribute("data-active"), "false");
  assert.equal(await page.locator(".dusk-video").count(), 0);
  await page.close();
});

test("footer motion preference persists and reduced motion exposes final states immediately", async () => {
  const page = await browser.newPage({ reducedMotion: "no-preference", viewport: { width: 1440, height: 1000 } });
  await page.goto(`${base}/?hour=9`);
  await page.getByRole("button", { name: "Motion: On", exact: true }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem("alter-motion")), "off");
  await page.waitForFunction(() => document.querySelectorAll("video").length === 0);
  assert.equal(await page.locator("html").getAttribute("data-motion"), "off");
  await page.reload();
  assert.equal(await page.getByRole("button", { name: "Motion: Off", exact: true }).getAttribute("aria-pressed"), "false");
  assert.equal(await page.locator("video").count(), 0);
  assert.equal(await page.locator("[data-motion-effect]").evaluateAll((elements) => elements.every((element) => getComputedStyle(element).opacity === "1" && getComputedStyle(element).transform === "none")), true);
  assert.equal(await page.locator("body").evaluate((element) => getComputedStyle(element).transitionDuration), "0s");
  await page.locator("header").getByRole("radio", { name: "Night", exact: true }).locator("..").click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "night");
  assert.equal(await page.locator(".dusk-transition").getAttribute("data-active"), "false");
  await page.getByRole("button", { name: "Motion: Off", exact: true }).click();
  await page.getByRole("button", { name: "Motion: On", exact: true }).waitFor();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Motion: Off", exact: true }).waitFor();
  await page.getByRole("button", { name: "Motion: Off", exact: true }).click();
  assert.equal(await page.locator("html").getAttribute("data-motion"), "off");
  assert.equal(await page.locator("video").count(), 0);
  assert.equal(await page.locator(".pin-spacer").count(), 0);
  await page.close();

  const context = await browser.newContext({ reducedMotion: "no-preference" });
  await context.addInitScript(() => { for (const method of ["getItem", "setItem"]) Storage.prototype[method] = () => { throw new Error("Denied"); }; });
  const memory = await context.newPage();
  await memory.goto(`${base}/?hour=9`);
  await memory.getByRole("button", { name: "Motion: On", exact: true }).click();
  await memory.getByRole("button", { name: "Motion: Off", exact: true }).waitFor();
  assert.equal(await memory.locator("html").getAttribute("data-motion-preference"), "off");
  await memory.waitForFunction(() => document.querySelectorAll("video").length === 0);
  await context.close();
});

test("hero reveals, parallax and card focus effects keep their frames and filters do not replay entrances", async () => {
  const page = await browser.newPage({ reducedMotion: "no-preference", viewport: { width: 1440, height: 1000 } });
  await page.goto(`${base}/?hour=9`);
  await page.waitForFunction(() => [...document.querySelectorAll(".hero-content [data-motion-effect]")].every((element) => getComputedStyle(element).opacity === "1" && getComputedStyle(element).transform === "none"));
  assert.equal(await page.locator(".hero-content").evaluate((element) => getComputedStyle(element).color), "rgb(14, 14, 16)");
  const initial = await page.locator(".hero-media").evaluate((element) => getComputedStyle(element).transform);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForFunction((initial) => getComputedStyle(document.querySelector(".hero-media")).transform !== initial, initial);
  const coverage = await page.locator(".hero-media-window").evaluate((element) => {
    const frame = element.getBoundingClientRect(); const media = element.firstElementChild.getBoundingClientRect();
    return media.top <= frame.top && media.bottom >= frame.bottom && media.left <= frame.left && media.right >= frame.right;
  });
  assert.equal(coverage, true);
  const collection = page.locator("#collection");
  const card = collection.getByRole("button", { name: "Quick view: Meridian Overcoat", exact: true });
  await card.focus();
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".product-image-scale")).transform.startsWith("matrix(1.04"));
  assert.equal(await card.evaluate((element) => getComputedStyle(element).outlineStyle), "solid");
  await collection.getByRole("group", { name: "Mood", exact: true }).getByRole("button", { name: "Night edit" }).click();
  await collection.getByRole("group", { name: "Mood", exact: true }).getByRole("button", { name: "All", exact: true }).click();
  assert.equal(await collection.locator(".product-card").evaluateAll((elements) => elements.every((element) => getComputedStyle(element).opacity === "1" && getComputedStyle(element).transform === "none")), true);
  await page.screenshot({ path: "/tmp/alter-motion-collection.png" });
  await page.close();
});

test("Story preserves readable DOM order, pins only desktop media, cleans up and keeps CLS low", async () => {
  const titles = ["Made for the hour you're in", "One piece. Many hours.", "Style without a dividing line"];
  for (const [width, preference] of [[1440, "no-preference"], [375, "no-preference"], [1440, "reduce"]]) {
    const page = await browser.newPage({ reducedMotion: preference, viewport: { width, height: 1000 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.alterCLS = 0;
      window.alterShifts = [];
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) { window.alterCLS += entry.value; window.alterShifts.push(entry.value); } }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(`${base}/?hour=9`);
    assert.deepEqual(await page.locator(".story-beat h3").allTextContents(), titles);
    assert.equal(await page.locator(".story-beat").evaluateAll((elements) => elements.every((element) => !element.closest("[aria-hidden='true']") && element.textContent.trim().length > 80)), true);
    await page.locator("#story-title").scrollIntoViewIfNeeded();
    if (width >= 768 && preference !== "reduce") await page.waitForFunction(() => document.querySelector(".story-stage").dataset.pinned === "true");
    else assert.equal(await page.locator(".pin-spacer").count(), 0);
    for (const [index, beat] of (await page.locator(".story-beat").all()).entries()) {
      await beat.scrollIntoViewIfNeeded();
      await page.waitForFunction((index) => getComputedStyle(document.querySelectorAll(".story-beat")[index].firstElementChild).opacity === "1", index);
      await page.waitForFunction(() => [...document.querySelectorAll("video")].filter((video) => !video.paused).length <= 1);
      if (index === 1 && preference !== "reduce") await page.waitForFunction(() => document.querySelector(".story-beat:nth-child(2) video") && !document.querySelector(".story-beat:nth-child(2) video").paused);
    }
    assert.ok((await page.evaluate(() => window.alterCLS)) < 0.01, `CLS ${width}/${preference}: ${await page.evaluate(() => JSON.stringify(window.alterShifts))}`);
    console.log(`CLS ${width}/${preference}: ${await page.evaluate(() => window.alterCLS)}`);
    await page.screenshot({ path: `/tmp/alter-story-${width}-${preference}.png` });
    if (preference !== "reduce") {
      await page.getByRole("button", { name: "Motion: On", exact: true }).click();
      await page.waitForFunction(() => !document.querySelector(".pin-spacer"));
    }
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations);
    assert.deepEqual(violations.map((item) => ({ id: item.id, targets: item.nodes.map((node) => node.target) })), []);
    assert.deepEqual(errors, []);
    await page.getByRole("link", { name: "Style guide", exact: true }).click();
    await page.waitForFunction(() => location.pathname === "/style-guide");
    assert.equal(await page.locator(".pin-spacer").count(), 0);
    await page.close();
  }
});
