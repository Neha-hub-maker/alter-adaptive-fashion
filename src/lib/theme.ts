import { demoPresets, getDemoPreset, getPresetHour, getPhaseAccent, type DemoPreset } from "./adaptation.ts";

export const themes = ["day", "night"] as const;
export const themeModes = ["auto", ...themes] as const;
export const accents = ["petrol", "magenta", "camel", "gold"] as const;
export type Theme = (typeof themes)[number];
export type ThemeMode = (typeof themeModes)[number];
export type Accent = (typeof accents)[number];

export function resolveTheme(hour: number): Theme {
  if (!Number.isFinite(hour) || hour < 0 || hour >= 24) throw new RangeError("Hour must be between 0 (inclusive) and 24 (exclusive).");
  return hour >= 6 && hour < 18 ? "day" : "night";
}

export function getPhaseLabel(hour: number): "Morning" | "Afternoon" | "Evening" | "Late" {
  if (!Number.isFinite(hour) || hour < 0 || hour >= 24) throw new RangeError("Hour must be between 0 (inclusive) and 24 (exclusive).");
  if (hour >= 6 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 18) return "Afternoon";
  if (hour >= 18 && hour < 22) return "Evening";
  return "Late";
}

export function getDemoHour(search: string): number | undefined {
  const value = new URLSearchParams(search).get("hour");
  if (value === null || !/^\d{1,2}$/.test(value) || Number(value) > 23) return undefined;
  return Number(value);
}

// Serialized with its pure dependencies so bootstrap and runtime share the same
// resolver/parser. No browser preference, network request, or hydration is needed.
function bootstrap(resolve: typeof resolveTheme, parseHour: typeof getDemoHour, phaseAccent: typeof getPhaseAccent, phase: typeof getPhaseLabel, parsePreset: typeof getDemoPreset, presetHour: typeof getPresetHour, presets: typeof demoPresets) {
  const root = document.documentElement;
  const now = new Date();
  let mode: ThemeMode = "auto";
  let accent: Accent = "petrol";
  let manualAccent = false;
  let personalized = true;
  try {
    const savedTheme = localStorage.getItem("alter-theme");
    if (savedTheme === "day" || savedTheme === "night") mode = savedTheme;
    const savedAccent = localStorage.getItem("alter-accent");
    if (savedAccent === "petrol" || savedAccent === "magenta" || savedAccent === "camel" || savedAccent === "gold") { accent = savedAccent; manualAccent = true; }
    personalized = localStorage.getItem("alter-personalization") !== "off";
  } catch { /* The root attributes remain the in-memory source of truth. */ }
  const preset = parsePreset(window.location.search, presets);
  root.dataset.realThemeMode = mode;
  root.dataset.realAccent = accent;
  root.dataset.realAccentManual = String(manualAccent);
  root.dataset.adaptiveDemo = preset ?? "";
  if (preset) { mode = "auto"; personalized = true; }
  const hour = presetHour(preset, presets) ?? (mode === "auto" ? (parseHour(window.location.search) ?? now.getHours()) : now.getHours());
  if (!manualAccent && personalized) accent = phaseAccent(hour);
  root.dataset.themeMode = mode;
  root.dataset.theme = mode === "auto" ? resolve(hour) : mode;
  root.dataset.accent = accent;
  root.dataset.accentManual = String(manualAccent);
  root.dataset.personalization = personalized ? "on" : "off";
  root.dataset.phase = phase(hour);
  root.dataset.accentTransition = "on";
  root.dataset.hour = String(hour);
  root.dataset.time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

// Inject dependencies as parameters: serialized functions must survive production
// minification without referring to a sibling's original JavaScript name.
export const themeBootstrap = `(${bootstrap.toString()})(${resolveTheme.toString()},${getDemoHour.toString()},${getPhaseAccent.toString()},${getPhaseLabel.toString()},${getDemoPreset.toString()},${getPresetHour.toString()},${JSON.stringify(demoPresets)});`;

export function getThemeSnapshot(): string {
  const { themeMode, theme, accent, hour, time } = document.documentElement.dataset;
  // Hot reload/client recovery can render before the before-paint script runs.
  return `${themeMode ?? "auto"}|${theme ?? "day"}|${accent ?? "petrol"}|${hour ?? ""}|${time ?? ""}`;
}
export function getServerThemeSnapshot(): string { return "auto|day|petrol||"; }
export function subscribeTheme(callback: () => void) {
  window.addEventListener("alter-theme-change", callback);
  return () => window.removeEventListener("alter-theme-change", callback);
}
function notifyTheme() { window.dispatchEvent(new Event("alter-theme-change")); }

type ThemeTransition = (theme: Theme, commit: () => void) => void;
let transition: ThemeTransition | undefined;
export function registerThemeTransition(handler: ThemeTransition) {
  transition = handler;
  return () => { if (transition === handler) transition = undefined; };
}
function requestTheme(theme: Theme) {
  const commit = () => {
    if (document.documentElement.dataset.theme === theme) return;
    document.documentElement.dataset.accentTransition = "off";
    document.documentElement.dataset.theme = theme;
    notifyTheme();
    requestAnimationFrame(() => requestAnimationFrame(() => { document.documentElement.dataset.accentTransition = "on"; }));
  };
  if (transition) transition(theme, commit);
  else commit();
}

export function refreshTheme() {
  const before = getThemeSnapshot();
  const root = document.documentElement;
  const now = new Date();
  const hour = getPresetHour(root.dataset.adaptiveDemo) ?? (root.dataset.themeMode === "auto" ? (getDemoHour(window.location.search) ?? now.getHours()) : now.getHours());
  root.dataset.hour = String(hour);
  root.dataset.phase = getPhaseLabel(hour);
  if (root.dataset.accentManual !== "true") root.dataset.accent = root.dataset.personalization === "off" ? "petrol" : getPhaseAccent(hour);
  root.dataset.time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  requestTheme(root.dataset.themeMode === "day" || root.dataset.themeMode === "night" ? root.dataset.themeMode : resolveTheme(hour));
  if (getThemeSnapshot() !== before) notifyTheme();
}

export function setThemeMode(mode: ThemeMode) {
  document.documentElement.dataset.themeMode = mode;
  try {
    if (document.documentElement.dataset.adaptiveDemo) { refreshTheme(); notifyTheme(); return; }
    if (mode === "auto") localStorage.removeItem("alter-theme");
    else localStorage.setItem("alter-theme", mode);
  } catch { /* Changes still apply for this page session. */ }
  refreshTheme();
  notifyTheme();
}

export function setAccent(accent: Accent) {
  document.documentElement.dataset.accent = accent;
  document.documentElement.dataset.accentManual = "true";
  try { if (!document.documentElement.dataset.adaptiveDemo) localStorage.setItem("alter-accent", accent); } catch { /* Memory-only preference. */ }
  notifyTheme();
}

let realSettings: { mode: string; accent: string; manual: string } | undefined;
export function setDemoTheme(preset: DemoPreset | null) {
  const root = document.documentElement;
  if (preset) {
    if (!realSettings) realSettings = root.dataset.adaptiveDemo
      ? { mode: root.dataset.realThemeMode ?? "auto", accent: root.dataset.realAccent ?? "petrol", manual: root.dataset.realAccentManual ?? "false" }
      : { mode: root.dataset.themeMode ?? "auto", accent: root.dataset.accent ?? "petrol", manual: root.dataset.accentManual ?? "false" };
    root.dataset.adaptiveDemo = preset;
    root.dataset.themeMode = "auto";
  } else {
    root.dataset.adaptiveDemo = "";
    if (realSettings) {
      root.dataset.themeMode = realSettings.mode;
      root.dataset.accent = realSettings.accent;
      root.dataset.accentManual = realSettings.manual;
    }
    realSettings = undefined;
    refreshTheme();
  }
}

export function startThemeClock() {
  let timer: number;
  const tick = () => {
    refreshTheme();
    // Align checks to minute boundaries rather than the mount time.
    timer = window.setTimeout(tick, 60_000 - Date.now() % 60_000);
  };
  tick();
  window.addEventListener("focus", refreshTheme);
  window.addEventListener("popstate", refreshTheme);
  document.addEventListener("visibilitychange", refreshTheme);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("focus", refreshTheme);
    window.removeEventListener("popstate", refreshTheme);
    document.removeEventListener("visibilitychange", refreshTheme);
  };
}
