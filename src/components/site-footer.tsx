"use client";

import Link from "next/link";
import { setMotionPreference, useMotionAllowed } from "@/lib/use-motion-allowed";

export function SiteFooter() {
  const allowed = useMotionAllowed();
  return <footer className="canvas site-footer">
    <div><Link href="/" className="font-display text-h3" aria-label="ALTER home">ALTER</Link><p className="text-small text-muted mt-2">Fictional brand and concept for a UX portfolio project.</p></div>
    <div className="flex flex-wrap items-center gap-3"><Link href="/style-guide" className="text-small underline underline-offset-4">Style guide</Link><button type="button" className="choice" aria-pressed={allowed} onClick={() => setMotionPreference(allowed ? "off" : "on")}>Motion: {allowed ? "On" : "Off"}</button></div>
  </footer>;
}
