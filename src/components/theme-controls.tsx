"use client";

import { useSyncExternalStore } from "react";
import { accents, themes, type Accent, type Theme } from "@/lib/theme";

function subscribe(callback: () => void) {
  window.addEventListener("alter-theme-change", callback);
  return () => window.removeEventListener("alter-theme-change", callback);
}
function snapshot() {
  return `${document.documentElement.dataset.theme}:${document.documentElement.dataset.accent}`;
}
function setPreference(kind: "theme" | "accent", value: Theme | Accent) {
  document.documentElement.dataset[kind] = value;
  try { localStorage.setItem(`alter-${kind}`, value); } catch { /* Memory-only preference. */ }
  window.dispatchEvent(new Event("alter-theme-change"));
}

export function ThemeControls() {
  const [theme, accent] = useSyncExternalStore(subscribe, snapshot, () => "day:petrol").split(":");
  return (
    <div className="flex flex-wrap gap-4">
      <fieldset>
        <legend className="label mb-2 text-muted">Mood</legend>
        <div className="flex flex-wrap gap-1">
          {themes.map((value) => (
            <label className="choice" key={value}>
              <input className="sr-only" type="radio" name="theme" value={value} checked={theme === value} onChange={() => setPreference("theme", value)} />
              <span className="capitalize">{value}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label mb-2 text-muted">Accent</legend>
        <div className="flex flex-wrap gap-1">
          {accents.map((value) => (
            <label className="choice" key={value}>
              <input className="sr-only" type="radio" name="accent" value={value} checked={accent === value} onChange={() => setPreference("accent", value)} />
              <span aria-hidden="true" className="h-2 w-2 border border-current" style={{ backgroundColor: `var(--${value})` }} />
              <span className="capitalize">{value}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
