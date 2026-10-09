"use client";

import { useSyncExternalStore } from "react";
import { getThemeSnapshot, getServerThemeSnapshot, subscribeTheme, type Theme, type ThemeMode, type Accent } from "./theme";

export function useTheme() {
  const [mode, theme, accent, hour, time] = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot).split("|");
  return {
    mode: mode as ThemeMode,
    theme: theme as Theme,
    accent: accent as Accent,
    hour: hour === "" ? undefined : Number(hour),
    time,
  };
}
