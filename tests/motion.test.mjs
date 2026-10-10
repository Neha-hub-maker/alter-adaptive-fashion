import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { durations, stagger, easing, resolveMotionAllowed, motionBootstrap } from "../src/lib/motion.ts";

test("motion tokens use milliseconds and one easing curve", () => {
  assert.deepEqual(durations, { fast: 200, base: 400, slow: 800 });
  assert.equal(easing.length, 4);
  assert.ok(stagger > 0 && stagger < durations.fast);
});
test("motion is allowed only when both system and visitor permit it", () => {
  assert.equal(resolveMotionAllowed(false, "on"), true);
  assert.equal(resolveMotionAllowed(false, "off"), false);
  assert.equal(resolveMotionAllowed(true, "on"), false);
  assert.equal(resolveMotionAllowed(true, "off"), false);
});
test("before-paint motion preference respects saved Off, system reduction and storage denial", () => {
  for (const [systemReduced, saved, denied, expected] of [[false, null, false, "on"], [false, "off", false, "off"], [true, "on", false, "off"], [false, null, true, "on"], [true, null, true, "off"]]) {
    const root = { dataset: {} };
    vm.runInNewContext(motionBootstrap, { document: { documentElement: root }, window: { matchMedia: () => ({ matches: systemReduced }) }, localStorage: { getItem() { if (denied) throw new Error("Denied"); return saved; } } });
    assert.equal(root.dataset.motion, expected);
  }
});
