"use client";
import { useEffect, useRef, useState } from "react";

/** Keep reserved geometry in the DOM; defer decorative bytes until near view. */
export function useNearViewport<T extends HTMLElement>(eager = false) {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(eager);
  useEffect(() => {
    if (near) return;
    if (!window.IntersectionObserver) {
      const frame = requestAnimationFrame(() => setNear(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setNear(true); observer.disconnect(); } }, { rootMargin: "200px" });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [near]);
  return [ref, near] as const;
}
