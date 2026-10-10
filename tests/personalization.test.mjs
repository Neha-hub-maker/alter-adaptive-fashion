import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { products } from "../src/data/products.ts";
import { clearProfile, recordView, recordVisit } from "../src/lib/profile-model.ts";
import { scoreProduct, recommendProducts } from "../src/lib/personalization.ts";
import { getDemoPreset, getPhaseAccent } from "../src/lib/adaptation.ts";
import { themeBootstrap } from "../src/lib/theme.ts";

test("ranking combines bounded theme, category, mood, hour and a two-visit freshness penalty", () => {
  let profile = recordVisit(clearProfile(), "2026-10-10T09:00:00.000Z");
  for (let index = 0; index < 4; index++) profile = recordView(profile, products[0]);
  const context = { profile, theme: "night", hour: 19 };
  assert.equal(scoreProduct(products[0], context), 137);
  assert.equal(scoreProduct(products[1], context), 145);
  assert.ok(scoreProduct(products[0], context) > scoreProduct(products[3], context));
  assert.ok(scoreProduct(products[6], { theme: "day", hour: 8 }) > scoreProduct(products[6], { theme: "day", hour: 14 }));
  const third = recordVisit(recordVisit(profile, "2026-10-11T09:00:00.000Z"), "2026-10-12T09:00:00.000Z");
  assert.equal(scoreProduct(products[0], { ...context, profile: third }), 145);
});
test("recommendations are deterministic, stable on ties, non-mutating and have visible-text reasons", () => {
  const context = { theme: "night", hour: 23 };
  const originals = [...products];
  assert.deepEqual(recommendProducts([products[1], products[0], products[2]], context, 4).map((pick) => pick.product.id), [products[1], products[0], products[2]].map((piece) => piece.id));
  assert.equal(recommendProducts(products, { theme: "day", hour: 8 }, 4)[0].product.id, "column-trouser");
  const all = recommendProducts(products, context, 20);
  assert.ok(all.every((pick) => typeof pick.reason === "string" && pick.reason.length));
  assert.ok(all.some((pick) => pick.reason === "Popular for this hour"));
  assert.ok(all.some((pick) => pick.reason === "Matches your Night edit"));
  const profile = recordView(recordVisit(clearProfile(), "2026-10-10T09:00:00.000Z"), products[0]);
  assert.ok(recommendProducts(products, { ...context, profile }, 4).some((pick) => pick.reason === "Because you viewed outerwear"));
  assert.deepEqual(products, originals);
  assert.deepEqual(recommendProducts(products, context, -1), []);
  assert.deepEqual(recommendProducts([], context, 4), []);
});
test("demo query accepts only named presets; default accents follow phases and manual choice always wins", () => {
  for (const preset of ["first", "returning", "latenight", "morning"]) assert.equal(getDemoPreset(`?demo=${preset}`), preset);
  for (const value of ["", "?demo=other", "?demo=__proto__", "?demo=toString"]) assert.equal(getDemoPreset(value), undefined);
  for (const [hour, accent] of [[0, "magenta"], [5, "magenta"], [6, "gold"], [11, "gold"], [12, "petrol"], [17, "petrol"], [18, "camel"], [21, "camel"], [22, "magenta"], [23, "magenta"]]) assert.equal(getPhaseAccent(hour), accent);
  const run = (search, saved = {}) => {
    const root = { dataset: {} };
    vm.runInNewContext(themeBootstrap, { document: { documentElement: root }, window: { location: { search } }, localStorage: { getItem: (key) => saved[key] ?? null }, URLSearchParams, Date });
    return root.dataset;
  };
  assert.equal(run("?hour=8").accent, "gold");
  assert.equal(run("?hour=23").accent, "magenta");
  assert.equal(run("?demo=latenight&hour=8").hour, "23");
  assert.equal(run("?demo=morning&hour=23").theme, "day");
  assert.equal(run("?hour=8", { "alter-accent": "camel" }).accent, "camel");
  assert.equal(run("?hour=8", { "alter-accent": "invalid" }).accent, "gold");
  assert.equal(run("?hour=8", { "alter-personalization": "off" }).accent, "petrol");
});
