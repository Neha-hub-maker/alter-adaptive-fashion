"use client";

import { m as motion, useAnimationControls, useInView } from "framer-motion";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { durations, easing } from "@/lib/motion";
import { isMotionAllowed, useMotionAllowed } from "@/lib/use-motion-allowed";

export function Reveal({ children, className = "", delay = 0, enabled = true, tag = "div", immediate = false }: { children: ReactNode; className?: string; delay?: number; enabled?: boolean; tag?: "div" | "li" | "span"; immediate?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const started = useRef(false);
  const controls = useAnimationControls();
  const allowed = useMotionAllowed();
  const inView = useInView(ref, { once: true, amount: 0.05 });
  useLayoutEffect(() => {
    // Wait for the external store's hydration snapshot before starting an entrance.
    if (!allowed && isMotionAllowed() && enabled) return;
    if (!allowed || !enabled) {
      controls.stop(); controls.set({ opacity: 1, y: 0 });
      started.current = true;
      ref.current?.removeAttribute("data-reveal");
      return;
    }
    if (started.current || (!inView && !immediate)) return;
    started.current = true;
    controls.set({ opacity: 0, y: 16 });
    ref.current?.removeAttribute("data-reveal");
    void controls.start({ opacity: 1, y: 0, transition: { duration: durations.base / 1000, delay: delay / 1000, ease: easing } });
  }, [allowed, enabled, inView, immediate, delay, controls]);
  const Component = tag === "li" ? motion.li : tag === "span" ? motion.span : motion.div;
  return <Component ref={ref as React.Ref<HTMLDivElement & HTMLLIElement & HTMLSpanElement>} initial={false} animate={controls} data-motion-effect data-reveal={enabled ? "pending" : undefined} className={className}>{children}</Component>;
}
