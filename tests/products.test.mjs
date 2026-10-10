import assert from "node:assert/strict";
import test from "node:test";
import { images } from "../src/data/images.ts";
import { products, productCategories, productColorTokens, filterProducts, sortForTheme, formatPrice } from "../src/data/products.ts";

test("nine unique concept pieces use existing, unbranded imagery and valid variants", () => {
  assert.equal(products.length, 9);
  assert.equal(new Set(products.map((product) => product.id)).size, products.length);
  for (const product of products) {
    assert.match(product.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(Number.isFinite(product.price) && product.price > 0, product.id);
    assert.ok(productCategories.includes(product.category));
    assert.ok(["day", "night"].includes(product.mood));
    const image = images.find((asset) => asset.file === product.imageFile);
    assert.ok(image, `Missing image for ${product.id}`);
    assert.equal(image.thirdPartyBranding, false, `Branded image forbidden for ${product.id}`);
    assert.ok(product.name && product.description);
    assert.equal(product.details.length, 3);
    assert.ok(product.details.every((detail) => typeof detail === "string" && detail.length > 0));
    assert.ok(product.sizes.length > 0);
    assert.equal(new Set(product.sizes).size, product.sizes.length);
    if (product.category === "accessories") assert.deepEqual(product.sizes, ["One size"]);
    assert.ok(product.colors.length > 0);
    assert.equal(new Set(product.colors.map((color) => color.token)).size, product.colors.length);
    assert.ok(product.colors.every((color) => color.name && productColorTokens.includes(color.token)));
  }
});

test("product filters combine mood and category without changing the catalog", () => {
  const original = [...products];
  assert.deepEqual(filterProducts(), products);
  assert.equal(filterProducts({ mood: "day" }).length, 4);
  assert.equal(filterProducts({ mood: "night" }).length, 5);
  assert.equal(filterProducts({ category: "outerwear" }).length, 4);
  assert.deepEqual(filterProducts({ category: "outerwear", mood: "day" }).map((product) => product.id), ["meridian-overcoat"]);
  assert.deepEqual(filterProducts({ category: "accessories", mood: "night" }), []);
  for (const category of productCategories) {
    assert.ok(filterProducts({ category }).every((product) => product.category === category));
  }
  assert.deepEqual(products, original);
});

test("theme sorting preserves caller order within both groups and never mutates input", () => {
  const subset = [products[7], products[5], products[1], products[3], products[0]];
  const before = [...subset];
  assert.deepEqual(sortForTheme(subset, "day"), [products[5], products[3], products[7], products[1], products[0]]);
  assert.deepEqual(sortForTheme(subset, "night"), [products[7], products[1], products[0], products[5], products[3]]);
  assert.deepEqual(subset, before);
  assert.deepEqual(sortForTheme([], "night"), []);
  assert.deepEqual(sortForTheme(filterProducts({ mood: "day" }), "night"), filterProducts({ mood: "day" }));
});

test("prices use en-US USD formatting", () => {
  assert.equal(formatPrice(420), "$420.00");
  assert.equal(formatPrice(64), "$64.00");
  assert.equal(formatPrice(128.5), "$128.50");
});
