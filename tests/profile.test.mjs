import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { products } from "../src/data/products.ts";
import { clearProfile, recordVisit, recordView, sanitizeProfile, profileBootstrap } from "../src/lib/profile-model.ts";
import { themeBootstrap, setAccent, setThemeMode } from "../src/lib/theme.ts";

const date = "2026-10-10T09:00:00.000Z";
test("profile validation resets corrupt versions/required fields and sanitizes bounded, known data", () => {
  const valid = recordView(recordVisit(clearProfile(), date), products[0]);
  for (const value of [null, [], {}, { ...valid, version: 2 }, { ...valid, visitCount: -1 }, { ...valid, lastVisitAt: "not-a-date" }, { ...valid, lastVisitAt: "2026-02-31T09:00:00.000Z" }, { ...valid, recentlyViewed: {} }, { ...valid, moodViews: [] }]) assert.deepEqual(sanitizeProfile(value), clearProfile());
  const clean = sanitizeProfile({ ...valid, recentlyViewed: [products[0].id, "unknown", products[0].id, 12, ...products.slice(1).map((product) => product.id)], categoryViews: { outerwear: 4, trousers: -1, suiting: 2.4, unknown: 999 }, moodViews: { day: Infinity, night: 8 }, viewedAtVisit: { [products[0].id]: 999, unknown: 1 } });
  assert.equal(clean.recentlyViewed.length, products.length);
  assert.equal(new Set(clean.recentlyViewed).size, products.length);
  assert.deepEqual(clean.moodViews, { day: 0, night: 8 });
  assert.equal(clean.categoryViews.outerwear, 4);
  assert.equal(clean.categoryViews.suiting, 0);
  assert.equal(clean.categoryViews.unknown, undefined);
  assert.deepEqual(clean.viewedAtVisit, {});
  const catalog = Array.from({ length: 15 }, (_, index) => ({ ...products[0], id: `test-${index}` }));
  assert.equal(sanitizeProfile({ ...valid, recentlyViewed: catalog.map((piece) => piece.id) }, catalog).recentlyViewed.length, 12);
});

test("pure visit/view reducers preserve input, deduplicate recency, count affinity and expire freshness", () => {
  const first = recordVisit(clearProfile(), date);
  const before = structuredClone(first);
  const one = recordView(first, products[0]);
  const two = recordView(recordView(one, products[1]), products[0]);
  assert.deepEqual(first, before);
  assert.deepEqual(two.recentlyViewed, [products[0].id, products[1].id]);
  assert.equal(two.categoryViews.outerwear, 3);
  assert.equal(two.moodViews.night, 3);
  assert.equal(recordVisit(two, date, true), two);
  const next = recordVisit(two, date);
  assert.equal(next.visitCount, 2);
  assert.equal(next.viewedAtVisit[products[0].id], 1);
  assert.deepEqual(recordVisit(next, date).viewedAtVisit, {});
  assert.throws(() => recordVisit(first, "wrong"), RangeError);
  let many = first;
  for (let index = 0; index < 20; index++) many = recordView(many, { ...products[0], id: `test-${index}` });
  assert.equal(many.recentlyViewed.length, 12);
  assert.equal(Object.keys(many.viewedAtVisit).length, 12);
});

let instance = 0;
async function withDevice({ saved = {}, session = new Map(), search = "", denied = false } = {}, run) {
  const values = new Map(Object.entries(saved));
  const mutations = [];
  const permit = () => { if (denied) throw new Error("Storage denied"); };
  const storage = (map, tracked) => ({ getItem: (key) => { permit(); return map.get(key) ?? null; }, setItem: (key, value) => { permit(); if (tracked) mutations.push(key); map.set(key, value); }, removeItem: (key) => { permit(); if (tracked) mutations.push(key); map.delete(key); } });
  const window = { location: { search, href: `http://alter.test/${search}` }, history: { state: null, replaceState(_state, _unused, url) { window.location.search = url.search; } }, dispatchEvent() {} };
  const document = { documentElement: { dataset: {} } };
  const localStorage = storage(values, true);
  const sessionStorage = storage(session, false);
  vm.runInNewContext(themeBootstrap + profileBootstrap, { window, document, localStorage, URLSearchParams, Date });
  const globals = { window, document, localStorage, sessionStorage, requestAnimationFrame: (callback) => callback() };
  const previous = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.defineProperties(globalThis, Object.fromEntries(Object.entries(globals).map(([key, value]) => [key, { configurable: true, value }])));
  try { await run(await import(`../src/lib/profile.ts?test=${instance++}`), values, mutations, session); }
  finally { for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } }
}

test("corrupt storage recovers and sessions count only once, including multiple mounts/reloads", async () => {
  const session = new Map();
  let stored;
  await withDevice({ saved: { "alter-profile": "{broken" }, session }, async (store, values) => {
    store.viewProduct(products[0].id);
    store.viewProduct(products[1].id);
    assert.equal(store.getProfileSnapshot().profile.visitCount, 1);
    stored = values.get("alter-profile");
  });
  await withDevice({ saved: { "alter-profile": stored }, session }, async (store) => {
    store.viewProduct(products[0].id);
    assert.equal(store.getProfileSnapshot().profile.visitCount, 1);
  });
  await withDevice({ saved: { "alter-profile": stored } }, async (store) => {
    store.viewProduct(products[0].id);
    assert.equal(store.getProfileSnapshot().profile.visitCount, 2);
  });
  await withDevice({ saved: { "alter-profile": "{broken" }, session }, async (store, values) => {
    store.setPersonalization(false);
    assert.deepEqual(JSON.parse(values.get("alter-profile")).recentlyViewed, []);
    assert.equal(store.getProfileSnapshot().profile.visitCount, 0);
  });
});

test("denied local/session storage retains memory preferences, one visit and reset behavior", async () => {
  await withDevice({ denied: true }, async (store, values, mutations) => {
    store.viewProduct(products[0].id); store.viewProduct(products[1].id);
    assert.equal(store.getProfileSnapshot().profile.visitCount, 1);
    const before = structuredClone(store.getProfileSnapshot().profile);
    store.setPersonalization(false); store.viewProduct(products[2].id); store.setPersonalization(true);
    assert.deepEqual(store.getProfileSnapshot().profile, before);
    assert.equal(store.resetProfile(), "memory");
    assert.deepEqual(store.getProfileSnapshot().profile, clearProfile());
    assert.equal(values.size, 0); assert.deepEqual(mutations, []);
  });
});

test("personalization Off records nothing and exposes a neutral profile until enabled", async () => {
  const savedProfile = recordView(recordVisit(clearProfile(), date), products[0]);
  await withDevice({ saved: { "alter-personalization": "off", "alter-profile": JSON.stringify(savedProfile) } }, async (store, values, mutations, session) => {
    store.viewProduct(products[1].id);
    assert.deepEqual(store.getProfileSnapshot().profile, clearProfile());
    assert.equal(store.getProfileSnapshot().enabled, false);
    assert.deepEqual(mutations, []);
    assert.equal(session.size, 0);
    store.setPersonalization(true);
    assert.equal(store.getProfileSnapshot().profile.visitCount, 2);
    store.resetProfile();
    assert.equal(values.has("alter-profile"), false);
    assert.deepEqual(store.getProfileSnapshot().profile, clearProfile());
  });
});

test("URL and panel demos never write real profile/preferences and exit restores exact real state", async () => {
  const real = recordView(recordVisit(clearProfile(), date), products[6]);
  for (const preset of ["first", "returning", "latenight", "morning"]) await withDevice({ search: `?demo=${preset}&hour=14`, saved: { "alter-profile": JSON.stringify(real), "alter-personalization": "off", "alter-theme": "day", "alter-accent": "gold" } }, async (store, values, mutations, session) => {
    const before = [...values];
    store.viewProduct(products[0].id);
    assert.equal(store.getProfileSnapshot().demo, preset);
    store.setPersonalization(false);
    store.setPersonalization(true);
    setAccent("magenta"); setThemeMode("night");
    assert.deepEqual([...values], before);
    assert.deepEqual(mutations, []);
    assert.equal(session.size, 0);
    store.exitDemo();
    assert.equal(store.getProfileSnapshot().enabled, false);
    assert.deepEqual(store.getProfileSnapshot().profile, clearProfile());
    assert.equal(document.documentElement.dataset.themeMode, "day");
    assert.equal(document.documentElement.dataset.accent, "gold");
    assert.equal(window.location.search, "?hour=14");
    store.setPersonalization(true);
    assert.deepEqual(store.getProfileSnapshot().profile.recentlyViewed, real.recentlyViewed);
  });
  await withDevice({}, async (store, values) => {
    store.viewProduct(products[3].id);
    const realSnapshot = structuredClone(store.getProfileSnapshot());
    const before = [...values];
    store.startDemo("returning"); store.viewProduct(products[1].id); store.clearRecentlyViewed(); store.resetProfile(); store.exitDemo();
    assert.deepEqual(store.getProfileSnapshot(), realSnapshot);
    assert.deepEqual([...values], before);
  });
});
