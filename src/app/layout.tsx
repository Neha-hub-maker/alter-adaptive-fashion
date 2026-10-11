import type { Metadata, Viewport } from "next";
import { getSiteUrl, pageMetadata, robotsPolicy } from "@/lib/seo";
import localFont from "next/font/local";
import { themeBootstrap } from "@/lib/theme";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DuskTransition } from "@/components/dusk-transition";
import { motionBootstrap } from "@/lib/motion";
import { profileBootstrap } from "@/lib/profile-model";
import { MotionProvider } from "@/components/motion-provider";
import { DemoBar } from "@/components/adaptive-controls";
import "./globals.css";

const display = localFont({ src: "../fonts/InstrumentSerif-Regular.woff2", variable: "--font-display", weight: "400", display: "swap" });
const body = localFont({ src: "../fonts/InterTight-Regular.woff2", variable: "--font-body", weight: "400", display: "swap" });
const label = localFont({ src: "../fonts/DMMono-Regular.woff2", variable: "--font-label", weight: "400", display: "swap" });

export const metadata: Metadata = {
  ...pageMetadata("Dress for the hour you're in.", "/"),
  metadataBase: getSiteUrl(),
  title: { default: "ALTER — Dress for the hour you're in.", template: "%s | ALTER" },
  robots: robotsPolicy(),
};
export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F4F1EA" }, { media: "(prefers-color-scheme: dark)", color: "#0E0E10" }],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="day" data-theme-mode="auto" data-accent="petrol" data-motion="off" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap + motionBootstrap + profileBootstrap }} /></head>
      <body className={`${display.variable} ${body.variable} ${label.variable}`}><MotionProvider><SiteHeader />{children}<SiteFooter /><DemoBar /><DuskTransition /></MotionProvider></body>
    </html>
  );
}
