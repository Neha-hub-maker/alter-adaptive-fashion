import type { Accent } from "./theme";

export const demoPresets = {
  first: { label: "First visit", hour: undefined, visits: 0, views: [] },
  returning: { label: "Returning, outerwear fan", hour: undefined, visits: 3, views: ["nocturne-leather-jacket", "rue-leather-overshirt", "meridian-overcoat", "hush-longline-coat", "meridian-overcoat"] },
  latenight: { label: "Late-night browser", hour: 23, visits: 3, views: ["studio-blazer", "midnight-ivory-set", "nocturne-leather-jacket"] },
  morning: { label: "Morning minimalist", hour: 8, visits: 3, views: ["column-trouser", "daylight-check-blazer", "column-trouser", "studio-blazer"] },
} as const;
export type DemoPreset = keyof typeof demoPresets;
export function getDemoPreset(search: string, presets: typeof demoPresets = demoPresets): DemoPreset | undefined {
  const value = new URLSearchParams(search).get("demo");
  return value && Object.hasOwn(presets, value) ? value as DemoPreset : undefined;
}
export function getPresetHour(preset: string | undefined, presets: typeof demoPresets = demoPresets): number | undefined {
  return preset && Object.hasOwn(presets, preset) ? presets[preset as DemoPreset].hour : undefined;
}
export function getPhaseAccent(hour: number): Accent {
  if (!Number.isFinite(hour) || hour < 0 || hour >= 24) throw new RangeError("Hour must be between 0 and 24.");
  return hour >= 6 && hour < 12 ? "gold" : hour >= 12 && hour < 18 ? "petrol" : hour >= 18 && hour < 22 ? "camel" : "magenta";
}

export const phaseSubheads = {
  Morning: "Easy layers for the first light and the hours ahead.",
  Afternoon: "Considered pieces for the city's changing afternoon rhythm.",
  Evening: "Daytime ease, reimagined for the city's evening hours.",
  Late: "Quiet silhouettes for late plans and your own pace.",
} as const;
