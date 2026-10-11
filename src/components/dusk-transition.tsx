"use client";

import { m as motion, useAnimationControls } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BackgroundVideo } from "@/components/background-video";
import { easing } from "@/lib/motion";
import { registerThemeTransition } from "@/lib/theme";
import { isMotionAllowed, useMotionAllowed } from "@/lib/use-motion-allowed";

export function DuskTransition() {
  const pathname = usePathname();
  const allowed = useMotionAllowed();
  const controls = useAnimationControls();
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!allowed || pathname !== "/") return;
    let running = false;
    let midpoint = false;
    let latest: (() => void) | undefined;
    const timers: number[] = [];
    const finish = () => {
      latest?.(); latest = undefined;
      controls.stop(); controls.set({ opacity: 0 });
      setActive(false); running = false; midpoint = false;
      for (const timer of timers) window.clearTimeout(timer);
      timers.length = 0;
      document.documentElement.removeAttribute("data-dusk-active");
    };
    const unregister = registerThemeTransition((theme, commit) => {
      if (!isMotionAllowed()) { finish(); commit(); window.dispatchEvent(new Event("alter-media-change")); return; }
      if (!running && document.documentElement.dataset.theme === theme) return;
      latest = commit;
      if (running) { if (midpoint) commit(); return; }
      running = true;
      document.documentElement.dataset.duskActive = "true";
      window.dispatchEvent(new Event("alter-media-change"));
      setActive(true);
      controls.set({ opacity: 0 });
      void controls.start({ opacity: 1, transition: { duration: 0.6, ease: easing } });
      timers.push(window.setTimeout(() => {
        midpoint = true; latest?.();
        void controls.start({ opacity: 0, transition: { duration: 0.6, ease: easing } });
      }, 600));
      // Never wait on a media load or animation promise to release the overlay.
      timers.push(window.setTimeout(() => { finish(); window.dispatchEvent(new Event("alter-media-change")); }, 1200));
      timers.push(window.setTimeout(finish, 1500));
    });
    const hidden = () => { if (document.visibilityState === "hidden") { finish(); window.dispatchEvent(new Event("alter-media-change")); } };
    document.addEventListener("visibilitychange", hidden);
    return () => { document.removeEventListener("visibilitychange", hidden); unregister(); finish(); window.dispatchEvent(new Event("alter-media-change")); };
  }, [allowed, pathname, controls]);
  return <motion.div initial={false} animate={controls} aria-hidden="true" className="dusk-transition" data-active={active} style={{ opacity: 0, display: active ? "block" : "none" }}>
    {active && <BackgroundVideo id="mood-dusk-silhouette" priority overlay="none" className="dusk-video" />}
  </motion.div>;
}
