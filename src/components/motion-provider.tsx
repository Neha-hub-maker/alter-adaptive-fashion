"use client";
import { LazyMotion, domAnimation } from "framer-motion";
import type { ReactNode } from "react";

/** Load opacity/transform support without unused drag or layout-projection code. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation} strict>{children}</LazyMotion>;
}
