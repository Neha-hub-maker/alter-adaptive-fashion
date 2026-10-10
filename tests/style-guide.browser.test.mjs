import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { after, before, test } from "node:test";
import { chromium } from "playwright-core";
import { clearProfile, recordVisit, recordView } from "../src/lib/profile-model.ts";
import { products } from "../src/data/products.ts";

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
      const contrast = await page.locator(".text-accent-text").first().evaluate((element) => {
        const luminance = (color) => {
          const channels = color.match(/[\d.]+/g).slice(0, 3).map((value) => { const channel = Number(value) / 255; return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4; });
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        };
        const foreground = luminance(getComputedStyle(element).color);
        const background = luminance(getComputedStyle(document.body).backgroundColor);
        return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
      });
      assert.ok(contrast >= 4.5, `${theme}/${accent}: ${contrast}`);
      console.log(`Accent contrast ${theme}/${accent}: ${contrast.toFixed(2)}:1`);
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
  // The motion library is below the fold: its player elements load near view.
  assert.equal(await page.locator("video").count(), 0);
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
  await page.waitForFunction(() => [...document.querySelectorAll("video")].some((v) => decodeURIComponent(v.poster).includes("hero-day-street-walk-portrait-poster.jpg")));
  assert.equal(new URL(await video.getAttribute("poster"), base).searchParams.get("url"), "/video/hero-day-street-walk-portrait-poster.jpg");
  const frame = figure.locator(".background-video");
  const box = await frame.boundingBox();
  assert.ok(Math.abs(box.width / box.height - 9 / 16) < 0.01);
  await page.waitForFunction(() => [...document.images].some((image) => decodeURIComponent(image.currentSrc).includes("/hero-day-street-walk-portrait-poster.jpg") && image.complete));
  assert.deepEqual(await frame.boundingBox(), box);
  await page.setViewportSize({ width: 768, height: 900 });
  await figure.locator(".background-video").evaluate((element) => element.scrollIntoView({ block: "center" }));
  await page.waitForFunction(() => document.querySelector('video[src="/video/hero-day-street-walk.mp4"]'));
  await page.waitForFunction(() => [...document.querySelectorAll("video")].some((v) => decodeURIComponent(v.poster).includes("hero-day-street-walk-poster.jpg")));
  assert.equal(new URL(await video.getAttribute("poster"), base).searchParams.get("url"), "/video/hero-day-street-walk-poster.jpg");
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
    for (const frame of await page.locator("section[aria-labelledby='motion-title'] .background-video").all()) {
      await frame.scrollIntoViewIfNeeded();
      await frame.locator("picture img").waitFor();
    }
    const posters = page.locator("section[aria-labelledby='motion-title'] picture img");
    assert.equal(await posters.count(), 7);
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
  await page.clock.pauseAt(new Date("2026-10-09T05:59:00Z"));
  await page.goto(`${base}/`);
  await page.waitForFunction(() => document.querySelector(".hour-picks").dataset.ready === "true");
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
  assert.equal(await page.locator("#alter-menu-panel").evaluate((element) => element.open), false);
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
    assert.equal(await page.title(), "Dress for the hour you're in. | ALTER");
    assert.equal(await page.locator("html").getAttribute("data-theme"), mood);
    assert.equal(await page.locator("video").count(), 0);
    assert.equal(await page.locator(".hero-layer").first().evaluate((element) => getComputedStyle(element).transitionDuration), "0s");
    assert.equal(await page.getByRole("link", { name: "Explore the collection" }).getAttribute("href"), "#collection");
    assert.equal(await page.getByRole("link", { name: "Our story", exact: true }).getAttribute("href"), "#story");
    if (mood === "night") assert.ok(await page.locator(".hero-layer-night .hero-night-photo img").getAttribute("src").then((src) => src.includes("street-night-allwhite")));
    else assert.equal(await page.locator(".hero-night-photo img").count(), 0);
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
  const cards = collection.locator(".collection-grid").getByRole("button", { name: /^Quick view:/ });
  await page.waitForFunction(() => document.querySelector(".collection-grid .product-card-button")?.getAttribute("aria-label") === "Quick view: Meridian Overcoat");
  assert.equal(await cards.count(), 9);
  assert.equal(await collection.getByRole("status").textContent(), "9 pieces");
  assert.match(await collection.innerText(), /Day edit leads/i);
  const originalDayOrder = await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute("aria-label")));
  assert.deepEqual(originalDayOrder.slice(0, 4), ["Meridian Overcoat", "Daylight Check Blazer", "Column Trouser", "Pearl & Gold Jewellery Edit"].map((name) => `Quick view: ${name}`));
  await page.locator("header").getByRole("radio", { name: "Night", exact: true }).locator("..").click();
  await page.waitForFunction(() => document.querySelector(".collection-grid .product-card-button")?.getAttribute("aria-label") === "Quick view: Nocturne Leather Jacket");
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
  const card = page.locator(".collection-grid").getByRole("button", { name: "Quick view: Studio Blazer", exact: true });
  await card.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Studio Blazer", exact: true });
  await dialog.waitFor({ state: "visible" });
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  const add = dialog.getByRole("button", { name: "Add to bag", exact: true });
  await add.waitFor({ state: "visible" });
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
    const imageBoxes = collection.locator(".collection-grid .product-card-image");
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
    await collection.locator(".collection-grid").getByRole("button", { name: /^Quick view:/ }).first().click();
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
    await page.locator(".collection-grid").getByRole("button", { name: "Quick view: Pearl & Gold Jewellery Edit", exact: true }).click();
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
  const card = collection.locator(".collection-grid").getByRole("button", { name: "Quick view: Meridian Overcoat", exact: true });
  await card.focus();
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".collection-grid .product-image-scale")).transform.startsWith("matrix(1.04"));
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

function returningProfile() {
  let profile = { ...recordVisit(clearProfile(), "2026-10-10T09:00:00.000Z"), visitCount: 3 };
  for (const product of products.slice(0, 6)) profile = recordView(profile, product);
  return profile;
}
async function savedDevice(page, saved) {
  await page.addInitScript((saved) => { for (const [key, value] of Object.entries(saved)) localStorage.setItem(key, value); }, saved);
}
async function deviceData(page) {
  return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)])));
}

test("hour picks show four explained cards, open quick view and re-rank without entrance animations", async () => {
  const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/?hour=8`);
  const rail = page.getByRole("region", { name: "Picked for your hour", exact: true });
  await page.waitForFunction(() => document.querySelector(".hour-picks").dataset.ready === "true");
  assert.equal(await rail.getByRole("listitem").count(), 4);
  assert.match(await rail.getByRole("button", { name: /^Quick view:/ }).first().getAttribute("aria-label"), /Column Trouser/);
  for (const label of await rail.locator(".recommendation-reason").all()) { assert.equal(await label.isVisible(), true); assert.ok((await label.innerText()).length > 10); }
  await rail.getByRole("button", { name: "Quick view: Column Trouser", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("dialog").waitFor({ state: "visible" });
  await page.getByRole("dialog").getByRole("heading", { name: "Column Trouser", exact: true }).waitFor();
  assert.equal(await page.getByRole("dialog").getByRole("heading", { name: "Column Trouser", exact: true }).count(), 1);
  await page.keyboard.press("Escape");
  await rail.getByRole("button", { name: "Quick view: Column Trouser", exact: true }).focus();
  // Programmatic choice leaves focus in the rail, as an automatic boundary does.
  await page.locator("header").getByRole("radio", { name: "Night", exact: true }).evaluate((element) => element.click());
  assert.equal(await rail.getByRole("listitem").count(), 4);
  assert.equal(await rail.locator(".adaptive-card").evaluateAll((elements) => elements.every((element) => getComputedStyle(element).opacity === "1" && getComputedStyle(element).transform === "none")), true);
  assert.equal(await page.locator(".collection-grid").getByRole("button", { name: "Quick view: Column Trouser", exact: true }).evaluate((element) => element === document.activeElement), true);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("alter-profile")).recentlyViewed[0]), "column-trouser");
  assert.deepEqual(errors, []);
  await page.close();
});

test("recently viewed, returning copy, session counting and Clear my data work locally", async () => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  // Seed once: reload must use the actual profile, not re-run a test seed script.
  await page.goto(`${base}/?hour=14`);
  await page.waitForFunction(() => document.querySelector(".hour-picks").dataset.ready === "true");
  await page.evaluate((profile) => { localStorage.setItem("alter-profile", JSON.stringify(profile)); }, returningProfile());
  await page.reload();
  await page.waitForFunction(() => document.querySelector(".hero-welcome").textContent.includes("Welcome back"));
  assert.match(await page.locator(".hero-welcome").innerText(), /Daylight Check Blazer/);
  assert.equal(await page.locator(".hero-welcome").getAttribute("aria-live"), null);
  const recent = page.getByRole("region", { name: "Recently viewed", exact: true });
  assert.equal(await recent.getByRole("listitem").count(), 6);
  await recent.getByRole("button", { name: "Quick view: Studio Blazer", exact: true }).click();
  await page.keyboard.press("Escape");
  assert.match(await recent.getByRole("button", { name: /^Quick view:/ }).first().getAttribute("aria-label"), /Studio Blazer/);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("alter-profile")).visitCount), 3);
  await page.reload();
  await page.waitForFunction(() => document.querySelector(".recent-slot").dataset.ready === "true");
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("alter-profile")).visitCount), 3);
  await page.getByRole("button", { name: "Clear recently viewed", exact: true }).click();
  assert.equal(await recent.isVisible(), false);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("alter-profile")).recentlyViewed.length), 0);
  await page.getByRole("button", { name: "Clear my data", exact: true }).click();
  assert.match(await page.locator(".adaptive-confirmation").innerText(), /cleared from this device/);
  assert.equal(await page.evaluate(() => localStorage.getItem("alter-profile")), null);
  assert.equal(await page.locator(".hero-welcome").innerText(), "");
  await page.reload();
  await page.waitForFunction(() => document.querySelector(".hour-picks").dataset.ready === "true");
  assert.equal(await page.evaluate(() => localStorage.getItem("alter-profile")), null);
  await context.close();
});

test("personalization Off hides adaptation, records nothing, persists and keeps quick view usable", async () => {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const stored = JSON.stringify(returningProfile());
  await savedDevice(page, { "alter-profile": stored, "alter-personalization": "off" });
  await page.goto(`${base}/?hour=8`);
  const setting = page.getByRole("button", { name: "Personalization: Off", exact: true });
  await page.waitForFunction(() => document.querySelector(".adaptive-controls button").getAttribute("aria-pressed") === "false");
  assert.equal(await page.locator(".hour-picks").isVisible(), false);
  assert.equal(await page.locator(".recent-slot").isVisible(), false);
  assert.equal(await page.locator("html").getAttribute("data-accent"), "petrol");
  assert.match(await page.locator(".hero-subhead").innerText(), /An adaptive wardrobe/);
  await page.locator(".collection-grid").getByRole("button", { name: "Quick view: Meridian Overcoat", exact: true }).click();
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => localStorage.getItem("alter-profile")), stored);
  assert.equal(await page.evaluate(() => sessionStorage.getItem("alter-visit-counted")), null);
  await setting.click();
  await page.getByRole("button", { name: "Personalization: On", exact: true }).waitFor();
  assert.equal(await page.locator(".hour-picks").isVisible(), true);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("alter-profile")).visitCount), 4);
  await page.getByRole("button", { name: "Personalization: On", exact: true }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem("alter-personalization")), "off");
  await page.getByRole("button", { name: "Clear my data", exact: true }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem("alter-profile")), null);
  await page.close();
});

test("demo dialog is keyboard accessible and temporary views/settings restore real state on exit", async () => {
  const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 1440, height: 1000 } });
  await savedDevice(page, { "alter-profile": JSON.stringify(returningProfile()), "alter-theme": "day", "alter-accent": "gold" });
  await page.goto(`${base}/?hour=14`);
  await page.waitForFunction(() => document.querySelector(".hour-picks").dataset.ready === "true");
  const before = await deviceData(page);
  const trigger = page.getByRole("button", { name: "See how ALTER adapts", exact: true });
  await trigger.focus(); await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "See how ALTER adapts", exact: true });
  await dialog.waitFor({ state: "visible" });
  await dialog.getByRole("button", { name: "Morning minimalist", exact: true }).waitFor();
  await dialog.getByRole("button", { name: "Close demo panel", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  assert.equal(await dialog.getByRole("button", { name: "Morning minimalist", exact: true }).evaluate((element) => element === document.activeElement), true);
  await page.keyboard.press("Escape");
  assert.equal(await trigger.evaluate((element) => element === document.activeElement), true);
  await trigger.click(); await dialog.getByRole("button", { name: "Late-night browser", exact: true }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === "night");
  assert.equal(await page.locator("html").getAttribute("data-hour"), "23");
  assert.match(await page.locator(".hero-subhead").innerText(), /late plans/);
  await page.locator(".collection-grid").getByRole("button", { name: "Quick view: Rue Leather Overshirt", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.locator("header").getByRole("radio", { name: "Night", exact: true }).locator("..").click();
  await page.getByRole("button", { name: "Personalization: On", exact: true }).click();
  await page.getByRole("button", { name: "Personalization: Off", exact: true }).click();
  assert.deepEqual(await deviceData(page), before);
  await page.getByRole("button", { name: "Demo mode: Exit", exact: true }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "day");
  assert.equal(await page.locator("html").getAttribute("data-accent"), "gold");
  assert.equal(await page.locator(".demo-bar").isVisible(), false);
  assert.deepEqual(await deviceData(page), before);
  assert.match(await page.locator(".hero-welcome").innerText(), /Daylight Check Blazer/);
  assert.equal(await trigger.evaluate((element) => element === document.activeElement), true);
  await page.close();
});

test("shareable demo presets bootstrap correct hours without writing saved data or playing initial dusk", async () => {
  for (const width of [375, 1440]) for (const [preset, hour, mood] of [["first", 14, "day"], ["returning", 14, "day"], ["latenight", 23, "night"], ["morning", 8, "day"]]) {
    const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width, height: 1000 } });
    if (width === 375) await page.route("**/*.js", async (route) => { await new Promise((resolve) => setTimeout(resolve, 300)); await route.continue(); });
    await page.addInitScript(() => {
      window.demoCLS = 0;
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.demoCLS += entry.value; }).observe({ type: "layout-shift", buffered: true });
    });
    const stored = JSON.stringify(returningProfile());
    await savedDevice(page, { "alter-profile": stored, "alter-personalization": "off", "alter-theme": "night", "alter-accent": "camel" });
    await page.goto(`${base}/?demo=${preset}&hour=14`);
    await page.waitForFunction(() => document.querySelector(".hour-picks").dataset.ready === "true");
    assert.ok(await page.evaluate(() => window.demoCLS) < 0.0001, `Demo CLS ${preset}/${width}: ${await page.evaluate(() => window.demoCLS)}`);
    assert.equal(await page.locator("html").getAttribute("data-hour"), String(hour));
    assert.equal(await page.locator("html").getAttribute("data-theme"), mood);
    assert.equal(await page.locator("html").getAttribute("data-accent"), "camel");
    assert.equal(await page.locator(".dusk-transition").getAttribute("data-active"), "false");
    assert.equal(await page.evaluate(() => localStorage.getItem("alter-profile")), stored);
    assert.equal(await page.evaluate(() => sessionStorage.getItem("alter-visit-counted")), null);
    await page.getByRole("button", { name: "Demo mode: Exit", exact: true }).click();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "night");
    assert.equal(await page.locator(".hour-picks").isVisible(), false);
    assert.equal(await page.evaluate(() => new URL(location.href).searchParams.has("demo")), false);
    assert.equal(await page.evaluate(() => localStorage.getItem("alter-profile")), stored);
    await page.close();
  }
});

test("adaptive hydration reserves layout, accents remain accessible and denied storage stays usable", async () => {
  for (const width of [375, 1440]) {
    const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width, height: 1000 } });
    const errors = [];
    const unexpectedRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (/hydration|hydrated|server.rendered|didn.t match/i.test(message.text())) errors.push(message.text()); });
    page.on("request", (request) => { if (new URL(request.url()).origin !== base || request.method() !== "GET") unexpectedRequests.push(`${request.method()} ${request.url()}`); });
    await savedDevice(page, { "alter-profile": JSON.stringify(returningProfile()) });
    await page.addInitScript(() => {
      window.adaptiveCLS = 0;
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.adaptiveCLS += entry.value; }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(`${base}/?hour=8`);
    await page.waitForFunction(() => document.querySelector(".hour-picks").dataset.ready === "true");
    assert.ok(await page.evaluate(() => window.adaptiveCLS) < 0.001);
    const top = await page.locator("#hero-title").evaluate((element) => element.getBoundingClientRect().top);
    await page.getByRole("button", { name: "Clear my data", exact: true }).click();
    await page.evaluate(() => scrollTo(0, 0));
    assert.ok(Math.abs((await page.locator("#hero-title").evaluate((element) => element.getBoundingClientRect().top)) - top) < 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations);
    assert.deepEqual(violations.map((item) => ({ id: item.id, targets: item.nodes.map((node) => node.target) })), []);
    assert.deepEqual(errors, []);
    assert.deepEqual(unexpectedRequests, []);
    console.log(`Adaptive initial CLS ${width}: ${await page.evaluate(() => window.adaptiveCLS)}`);
    await page.screenshot({ path: `/tmp/alter-adaptive-${width}.png` });
    await page.close();
  }
  const page = await browser.newPage({ reducedMotion: "reduce" });
  await page.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new Error("denied"); } }); Object.defineProperty(window, "sessionStorage", { get() { throw new Error("denied"); } }); });
  await page.goto(`${base}/?hour=8`);
  await page.locator(".collection-grid").getByRole("button", { name: "Quick view: Column Trouser", exact: true }).click();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".recent-slot").isVisible(), true);
  await page.getByRole("button", { name: "Personalization: On", exact: true }).click();
  assert.equal(await page.locator(".recent-slot").isVisible(), false);
  await page.getByRole("button", { name: "Clear my data", exact: true }).click();
  assert.match(await page.locator(".adaptive-confirmation").innerText(), /cleared for this page/);
  await page.close();
});

async function assertAxe(page, state) {
  if (!await page.evaluate(() => Boolean(window.axe))) await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } })).violations);
  assert.deepEqual(violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) })), [], state);
}

test("release accessibility matrix covers page, menu, size error, demo and empty states in eight palettes", async () => {
  for (const theme of ["day", "night"]) for (const accent of ["petrol", "magenta", "camel", "gold"]) {
    const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 375, height: 900 } });
    await savedDevice(page, { "alter-theme": theme, "alter-accent": accent });
    await page.goto(`${base}/?hour=13`);
    await page.waitForFunction(() => document.querySelector(".hour-picks").dataset.ready === "true");
    const firstCard = page.locator(".collection-grid button").first();
    const descriptions = await firstCard.evaluate((n) => n.getAttribute("aria-describedby").split(" ").map((id) => document.getElementById(id)?.textContent).join(" "));
    assert.match(descriptions, /\$[\d,.]+ \/ (day|night) edit\./);
    await assertAxe(page, `${theme}/${accent}: homepage`);
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await assertAxe(page, `${theme}/${accent}: mobile menu`);
    await page.keyboard.press("Escape");
    await page.locator(".collection-grid button").first().click();
    await page.getByRole("button", { name: "Add to bag", exact: true }).click();
    await assertAxe(page, `${theme}/${accent}: quick view with size error`);
    await page.keyboard.press("Escape");
    await page.locator(".collection-filters").getByRole("group", { name: "Mood", exact: true }).getByRole("button", { name: "Night edit" }).click();
    await page.locator(".collection-filters").getByRole("group", { name: "Category", exact: true }).getByRole("button", { name: /^accessories$/i }).click();
    await assertAxe(page, `${theme}/${accent}: empty filter`);
    await page.getByRole("button", { name: "Clear filters", exact: true }).click();
    await page.getByRole("button", { name: "See how ALTER adapts", exact: true }).click();
    await assertAxe(page, `${theme}/${accent}: demo panel`);
    await page.getByRole("button", { name: "Returning, outerwear fan", exact: true }).click();
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page.locator("#alter-menu-panel").getByRole("radio", { name: theme, exact: false }).locator("..").click();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("html").getAttribute("data-accent"), accent);
    await assertAxe(page, `${theme}/${accent}: active demo`);
    await page.goto(`${base}/style-guide`);
    await assertAxe(page, `${theme}/${accent}: style guide`);
    await page.close();
  }
});

test("release smoke: branded 404, credits, sharing metadata and default noindex routes", async () => {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const missing = await page.goto(`${base}/this-page-does-not-exist`);
  assert.equal(missing.status(), 404);
  assert.equal(await page.getByRole("heading", { level: 1, name: "This hour slipped away." }).count(), 1);
  await page.getByRole("link", { name: "Back to ALTER", exact: true }).click();
  await page.waitForFunction(() => document.title.includes(" | ALTER"));
  assert.match(await page.title(), /Dress for the hour.*\| ALTER/);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");
  assert.ok(await page.locator('link[rel="canonical"]').getAttribute("href"));
  assert.equal(await page.locator('meta[property="og:image:width"]').getAttribute("content"), "1200");
  assert.equal(await page.locator('meta[property="og:image:height"]').getAttribute("content"), "630");
  assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute("content"), "summary_large_image");
  assert.equal(await page.locator('meta[name="theme-color"]').count(), 2);
  const social = await fetch(`${base}/opengraph-image`); const icon = await fetch(`${base}/icon`);
  assert.equal(social.status, 200); assert.equal(icon.status, 200);
  assert.match(social.headers.get("content-type"), /image\/png/);
  const dimensions = Buffer.from(await social.arrayBuffer());
  assert.equal(dimensions.readUInt32BE(16), 1200); assert.equal(dimensions.readUInt32BE(20), 630);
  const { default: sharp } = await import("sharp");
  const photoStats = await sharp(dimensions).extract({ left: 640, top: 0, width: 560, height: 630 }).stats();
  const letteringStats = await sharp(dimensions).extract({ left: 0, top: 0, width: 640, height: 630 }).stats();
  assert.ok(photoStats.channels[0].stdev > 25, "social preview contains the photo, not a blank area");
  assert.ok(letteringStats.channels[0].mean < 100 && letteringStats.channels[0].max > 220, "wordmark has light text on Ink");
  assert.equal(social.headers.get("x-robots-tag"), "noindex, nofollow");
  await page.getByRole("link", { name: "Credits", exact: true }).click();
  await page.waitForURL(`${base}/credits`);
  assert.equal(new URL(page.url()).pathname, "/credits");
  assert.equal(await page.locator(".credit-list li").count(), 23);
  assert.equal(await page.getByText("Creator: to be added by the site owner", { exact: true }).count(), 7);
  await assertAxe(page, "credits");
  const robots = await fetch(`${base}/robots.txt`); const sitemap = await fetch(`${base}/sitemap.xml`);
  assert.match(await robots.text(), /Disallow: \/\s/);
  assert.doesNotMatch(await sitemap.text(), /<loc>/);
  assert.equal(robots.headers.get("x-robots-tag"), "noindex, nofollow");
  await page.goto(`${base}/style-guide`);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");
  await page.close();
});

test("release reflow, mobile targets, heading order, landmarks and enlarged text remain usable", async () => {
  for (const path of ["/", "/style-guide", "/credits"]) {
    const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 320, height: 900 } });
    await page.goto(`${base}${path}`);
    await page.waitForFunction(() => document.documentElement.dataset.personalization !== undefined);
    assert.equal(await page.locator("main").count(), 1); assert.equal(await page.locator("header").count(), 1); assert.equal(await page.locator("footer").count(), 1);
    assert.equal(await page.locator("h1").count(), 1);
    const headings = await page.locator("main h1,main h2,main h3,main h4").evaluateAll((nodes) => nodes.map((n) => Number(n.tagName.slice(1))));
    for (let i = 1; i < headings.length; i++) assert.ok(headings[i] <= headings[i - 1] + 1, `${path}: skipped heading`);
    await page.keyboard.press("Tab"); assert.equal(await page.getByRole("link", { name: "Skip to content" }).evaluate((n) => n === document.activeElement), true);
    await page.keyboard.press("Enter"); assert.equal(await page.locator("main").evaluate((n) => n === document.activeElement), true);
    const targets = await page.locator("a,button,label.choice").evaluateAll((nodes) => nodes.filter((n) => n.getClientRects().length && getComputedStyle(n).visibility !== "hidden" && !n.closest("dialog:not([open])") && !n.classList.contains("skip-link")).map((n) => { const b = n.getBoundingClientRect(); return { name: n.textContent.trim(), width: b.width, height: b.height }; }));
    for (const t of targets) assert.ok(t.width >= 44 && t.height >= 44, `${path}: ${JSON.stringify(t)}`);
    await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }" });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${path}: text spacing overflow`);
    await page.screenshot({ path: `/tmp/alter-spacing-${path === "/" ? "home" : path.slice(1)}.png`, fullPage: true });
    // 200% text sizing is separate from the 320px reflow / effective 200% viewport check.
    await page.setViewportSize({ width: 640, height: 900 });
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${path}: enlarged text overflow`);
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page.getByRole("button", { name: "Close menu", exact: true }).click();
    await page.getByRole("button", { name: "See how ALTER adapts", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Close demo panel", exact: true }).isVisible(), true);
    assert.equal(await page.getByRole("dialog").evaluate((n) => n.scrollWidth <= n.clientWidth), true, `${path}: enlarged dialog overflow`);
    await page.keyboard.press("Escape");
    await page.close();
  }
});

test("lazy quick-view loading traps focus immediately and keeps the dialog stable as content arrives", async () => {
  const { readdir, readFile } = await import("node:fs/promises");
  const files = await readdir(".next/static/chunks");
  const candidates = await Promise.all(files.filter((file) => file.endsWith(".js")).map(async (file) => ({ file, content: await readFile(`.next/static/chunks/${file}`, "utf8") })));
  const chunk = candidates.find(({ content }) => content.includes("Choose a size before adding to your bag."));
  assert.ok(chunk, "quick-view content has its own compiled chunk");
  const page = await browser.newPage({ reducedMotion: "reduce" });
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  await page.route(`**/_next/static/chunks/${chunk.file}`, async (route) => { await pending; await route.continue(); });
  await page.goto(`${base}/?hour=9`);
  const card = page.locator(".collection-grid button").first();
  await card.focus(); await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("status").waitFor();
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  assert.equal(await close.evaluate((n) => n === document.activeElement), true);
  const before = await dialog.boundingBox();
  const closeBefore = await close.boundingBox();
  await page.waitForTimeout(700);
  release();
  await dialog.getByRole("button", { name: "Add to bag", exact: true }).waitFor();
  assert.deepEqual(await dialog.boundingBox(), before);
  assert.deepEqual(await close.boundingBox(), closeBefore);
  await close.focus();
  await page.keyboard.press("Shift+Tab");
  assert.equal(await dialog.getByRole("button", { name: "Add to bag", exact: true }).evaluate((n) => n === document.activeElement), true);
  await page.keyboard.press("Tab");
  assert.equal(await close.evaluate((n) => n === document.activeElement), true);
  await page.keyboard.press("Escape");
  assert.equal(await card.evaluate((n) => n === document.activeElement), true);
  release();
  await page.waitForTimeout(100);
  assert.equal(await page.locator(".quick-view").count(), 0);
  await page.close();

  const cancelled = await browser.newPage({ reducedMotion: "reduce" });
  let finish;
  const deferred = new Promise((resolve) => { finish = resolve; });
  await cancelled.route(`**/_next/static/chunks/${chunk.file}`, async (route) => { await deferred; await route.continue(); });
  await cancelled.goto(`${base}/?hour=9`);
  const trigger = cancelled.locator(".collection-grid button").first();
  await trigger.click();
  await cancelled.getByRole("dialog").getByRole("status").waitFor();
  await cancelled.keyboard.press("Escape");
  assert.equal(await trigger.evaluate((n) => n === document.activeElement), true);
  finish();
  await cancelled.waitForTimeout(200);
  assert.equal(await cancelled.locator(".quick-view").count(), 0);
  await cancelled.close();
});

test("decorative assets stay deferred until view and mobile never imports desktop pinning", async () => {
  const page = await browser.newPage({ reducedMotion: "no-preference", viewport: { width: 375, height: 812 } });
  const requests = [];
  page.on("request", (r) => requests.push(decodeURIComponent(r.url())));
  await page.goto(`${base}/?hour=9`);
  await page.waitForFunction(() => [...document.querySelectorAll("video")].some((v) => !v.paused));
  assert.ok(requests.some((r) => r.endsWith("hero-day-street-walk-portrait.mp4")));
  assert.equal(requests.some((r) => r.includes("behind-the-scenes-shoot") || r.includes("boutique-hands-sweaters") || r.includes("/images/optimized/")), false);
  assert.equal(await page.locator('.product-card-image img').count(), 0);
  await page.locator("#story").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll("#story img")].some((i) => i.complete && i.naturalWidth));
  assert.equal(await page.locator("[data-pinned]").count(), 0);
  // GSAP is excluded at the desktop media gate, rather than loading an unused pinning library.
  const { readdir, readFile } = await import("node:fs/promises");
  const chunks = await readdir(".next/static/chunks");
  const gsapChunks = [];
  for (const file of chunks.filter((file) => file.endsWith(".js"))) if ((await readFile(`.next/static/chunks/${file}`, "utf8")).includes("pinReparent")) gsapChunks.push(file);
  assert.ok(gsapChunks.length > 0);
  assert.equal(requests.some((r) => gsapChunks.some((file) => r.includes(file))), false);
  await page.close();
});

test("mobile menu closing at the desktop breakpoint restores focus to a visible control", async () => {
  const page = await browser.newPage({ viewport: { width: 375, height: 900 }, reducedMotion: "reduce" });
  await page.goto(base);
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.waitForFunction(() => !document.getElementById("alter-menu-panel").open);
  assert.equal(await page.locator("header").getByRole("link", { name: "ALTER home", exact: true }).evaluate((n) => n === document.activeElement), true);
  assert.equal(await page.locator("body").evaluate((n) => n.style.overflow), "");
  await page.close();
});
