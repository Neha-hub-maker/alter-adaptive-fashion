import type { Metadata } from "next";
import localFont from "next/font/local";
import { themeBootstrap } from "@/lib/theme";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DuskTransition } from "@/components/dusk-transition";
import { motionBootstrap } from "@/lib/motion";
import { profileBootstrap } from "@/lib/profile-model";
import { DemoBar } from "@/components/adaptive-controls";
import "./globals.css";

const display = localFont({ src: "../fonts/InstrumentSerif-Regular.ttf", variable: "--font-display", weight: "400", display: "swap" });
const body = localFont({ src: "../fonts/InterTight-Variable.ttf", variable: "--font-body", weight: "100 900", display: "swap" });
const label = localFont({ src: "../fonts/DMMono-Regular.ttf", variable: "--font-label", weight: "400", display: "swap" });

export const metadata: Metadata = {
  title: "ALTER — Foundation",
  description: "Dress for the hour you're in. A fictional adaptive fashion and lifestyle brand, created as a UX portfolio project.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="day" data-theme-mode="auto" data-accent="petrol" data-motion="off" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap + motionBootstrap + profileBootstrap }} /></head>
      <body className={`${display.variable} ${body.variable} ${label.variable}`}><SiteHeader />{children}<SiteFooter /><DemoBar /><DuskTransition /></body>
    </html>
  );
}
