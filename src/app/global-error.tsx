"use client";
import localFont from "next/font/local";
import { useLayoutEffect } from "react";
import { ErrorMessage } from "@/components/error-message";
import { getDemoHour, resolveTheme, accents } from "@/lib/theme";
import "./globals.css";

const display = localFont({ src: "../fonts/InstrumentSerif-Regular.woff2", variable: "--font-display", weight: "400", display: "swap" });
const body = localFont({ src: "../fonts/InterTight-Regular.woff2", variable: "--font-body", weight: "400", display: "swap" });
const label = localFont({ src: "../fonts/DMMono-Regular.woff2", variable: "--font-label", weight: "400", display: "swap" });
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useLayoutEffect(() => {
    let theme = resolveTheme(getDemoHour(window.location.search) ?? new Date().getHours());
    try {
      const saved = localStorage.getItem("alter-theme");
      if (saved === "day" || saved === "night") theme = saved;
      const accent = localStorage.getItem("alter-accent");
      if (accents.includes(accent as (typeof accents)[number])) document.documentElement.dataset.accent = accent!;
    } catch { /* Accessible auto theme also works without storage. */ }
    document.documentElement.dataset.theme = theme;
  }, []);
  return <html lang="en" data-motion="off" suppressHydrationWarning><body className={`${display.variable} ${body.variable} ${label.variable}`}><ErrorMessage retry={retry} /></body></html>;
}
