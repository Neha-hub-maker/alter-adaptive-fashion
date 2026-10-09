"use client";

import { useId } from "react";
import { accents, themeModes, setThemeMode, setAccent } from "@/lib/theme";
import { useTheme } from "@/lib/use-theme";

export function MoodControl({ compact = false }: { compact?: boolean }) {
  const { mode, theme } = useTheme();
  const id = useId();
  return (
    <fieldset aria-describedby={`${id}-status`}>
      <legend className={compact ? "sr-only" : "label mb-2 text-muted"}>Mood</legend>
      <div className="flex flex-wrap gap-1">
        {themeModes.map((value) => (
          <label className={`choice ${compact ? "label" : ""}`} key={value}>
            <input className="sr-only" type="radio" aria-label={value[0].toUpperCase() + value.slice(1)} name={`${id}-theme`} value={value} checked={mode === value} onChange={() => setThemeMode(value)} />
            <span className="capitalize">{value}</span>
            {value === "auto" && mode === "auto" && <span aria-hidden="true" className="auto-mood"><span className="day-edit">Day</span><span className="night-edit">Night</span></span>}
          </label>
        ))}
      </div>
      <span id={`${id}-status`} className="sr-only">{mode === "auto" ? `Auto currently uses the ${theme} mood.` : `The ${theme} mood is selected.`}</span>
    </fieldset>
  );
}

export function ThemeControls() {
  const { accent } = useTheme();
  const id = useId();
  return (
    <div className="flex flex-wrap gap-4">
      <MoodControl />
      <fieldset>
        <legend className="label mb-2 text-muted">Accent</legend>
        <div className="flex flex-wrap gap-1">
          {accents.map((value) => (
            <label className="choice" key={value}>
              <input className="sr-only" type="radio" name={`${id}-accent`} value={value} checked={accent === value} onChange={() => setAccent(value)} />
              <span aria-hidden="true" className="h-2 w-2 border border-current" style={{ backgroundColor: `var(--${value})` }} />
              <span className="capitalize">{value}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
