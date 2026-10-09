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
  resolveTheme(hour);
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
function bootstrap(resolve: typeof resolveTheme, parseHour: typeof getDemoHour) {
  const root = document.documentElement;
  const now = new Date();
  let mode: ThemeMode = "auto";
  let accent: Accent = "petrol";
  try {
    const savedTheme = localStorage.getItem("alter-theme");
    if (savedTheme === "day" || savedTheme === "night") mode = savedTheme;
    const savedAccent = localStorage.getItem("alter-accent");
    if (savedAccent === "petrol" || savedAccent === "magenta" || savedAccent === "camel" || savedAccent === "gold") accent = savedAccent;
  } catch { /* The root attributes remain the in-memory source of truth. */ }
  const hour = mode === "auto" ? (parseHour(window.location.search) ?? now.getHours()) : now.getHours();
  root.dataset.themeMode = mode;
  root.dataset.theme = mode === "auto" ? resolve(hour) : mode;
  root.dataset.accent = accent;
  root.dataset.hour = String(hour);
  root.dataset.time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export const themeBootstrap = `(${bootstrap.toString()})(${resolveTheme.toString()}, ${getDemoHour.toString()});`;

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

export function refreshTheme() {
  const before = getThemeSnapshot();
  const root = document.documentElement;
  const now = new Date();
  const hour = root.dataset.themeMode === "auto" ? (getDemoHour(window.location.search) ?? now.getHours()) : now.getHours();
  root.dataset.hour = String(hour);
  root.dataset.time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (root.dataset.themeMode === "auto") root.dataset.theme = resolveTheme(hour);
  if (getThemeSnapshot() !== before) notifyTheme();
}

export function setThemeMode(mode: ThemeMode) {
  document.documentElement.dataset.themeMode = mode;
  if (mode !== "auto") document.documentElement.dataset.theme = mode;
  try {
    if (mode === "auto") localStorage.removeItem("alter-theme");
    else localStorage.setItem("alter-theme", mode);
  } catch { /* Changes still apply for this page session. */ }
  refreshTheme();
  notifyTheme();
}

export function setAccent(accent: Accent) {
  document.documentElement.dataset.accent = accent;
  try { localStorage.setItem("alter-accent", accent); } catch { /* Memory-only preference. */ }
  notifyTheme();
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
