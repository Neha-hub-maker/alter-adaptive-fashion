export const durations = { fast: 200, base: 400, slow: 800 } as const;
export const easing: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const stagger = 80;
export type MotionPreference = "on" | "off";

export function resolveMotionAllowed(systemReduced: boolean, preference: MotionPreference): boolean {
  return !systemReduced && preference !== "off";
}

function bootstrap() {
  let preference = "on";
  try { if (localStorage.getItem("alter-motion") === "off") preference = "off"; } catch { /* Memory-only default. */ }
  const root = document.documentElement;
  root.dataset.motionPreference = preference;
  root.dataset.motion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches && preference === "on" ? "on" : "off";
}
export const motionBootstrap = `(${bootstrap.toString()})();`;
