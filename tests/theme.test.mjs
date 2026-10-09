import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { resolveTheme, getPhaseLabel, getDemoHour, themeBootstrap, getThemeSnapshot } from "../src/lib/theme.ts";

test("client recovery has a safe snapshot before bootstrap metadata exists", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { documentElement: { dataset: {} } } });
  try {
    assert.equal(getThemeSnapshot(), "auto|day|petrol||");
  } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else delete globalThis.document;
  }
});

test("theme boundaries cover 05:59, 06:00, 17:59 and 18:00", () => {
  assert.equal(resolveTheme(5 + 59 / 60), "night");
  assert.equal(resolveTheme(6), "day");
  assert.equal(resolveTheme(17 + 59 / 60), "day");
  assert.equal(resolveTheme(18), "night");
  assert.equal(resolveTheme(0), "night");
  assert.equal(resolveTheme(23), "night");
  assert.throws(() => resolveTheme(24), RangeError);
  assert.throws(() => resolveTheme(NaN), RangeError);
});

test("phase labels follow local hour ranges", () => {
  for (const [hour, phase] of [[0, "Late"], [5, "Late"], [6, "Morning"], [11, "Morning"], [12, "Afternoon"], [17, "Afternoon"], [18, "Evening"], [21, "Evening"], [22, "Late"], [23, "Late"]]) assert.equal(getPhaseLabel(hour), phase);
});

test("demo hours accept only integers from 0 through 23", () => {
  for (let hour = 0; hour <= 23; hour++) assert.equal(getDemoHour(`?hour=${hour}`), hour);
  for (const query of ["", "?hour=", "?hour=-1", "?hour=24", "?hour=6.5", "?hour=word", "?hour=%20", "?hour=Infinity"]) assert.equal(getDemoHour(query), undefined);
});

function runBootstrap({ hour = 9, search = "", saved = {}, denied = false } = {}) {
  const root = { dataset: {} };
  class LocalDate extends Date { getHours() { return hour; } getMinutes() { return 59; } }
  vm.runInNewContext(themeBootstrap, {
    document: { documentElement: root }, window: { location: { search } }, Date: LocalDate, URLSearchParams,
    localStorage: { getItem(key) { if (denied) throw new Error("Storage denied"); return saved[key] ?? null; } },
  });
  return root.dataset;
}

test("bootstrap resolves auto before hydration, honors manual choices, and survives denied storage", () => {
  assert.equal(runBootstrap({ hour: 5 }).theme, "night");
  assert.equal(runBootstrap({ hour: 6 }).theme, "day");
  assert.equal(runBootstrap({ hour: 9, search: "?hour=19" }).theme, "night");
  assert.equal(runBootstrap({ hour: 9, search: "?hour=24" }).theme, "day");
  const manual = runBootstrap({ hour: 9, search: "?hour=19", saved: { "alter-theme": "day", "alter-accent": "gold" } });
  assert.equal(manual.themeMode, "day");
  assert.equal(manual.theme, "day");
  assert.equal(manual.accent, "gold");
  assert.equal(manual.hour, "9");
  assert.equal(runBootstrap({ hour: 18, denied: true }).theme, "night");
  assert.equal(runBootstrap({ hour: 18, saved: { "alter-theme": "invalid" } }).themeMode, "auto");
});
