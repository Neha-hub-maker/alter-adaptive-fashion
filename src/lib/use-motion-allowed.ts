"use client";

import { useSyncExternalStore } from "react";
import { resolveMotionAllowed, type MotionPreference } from "@/lib/motion";

const query = "(prefers-reduced-motion: reduce)";
export function isMotionAllowed() {
  return resolveMotionAllowed(window.matchMedia(query).matches, document.documentElement.dataset.motionPreference === "off" ? "off" : "on");
}
function serverSnapshot() { return false; }
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  const update = () => {
    document.documentElement.dataset.motion = isMotionAllowed() ? "on" : "off";
    callback();
  };
  media.addEventListener("change", update);
  window.addEventListener("alter-motion-change", update);
  return () => {
    media.removeEventListener("change", update);
    window.removeEventListener("alter-motion-change", update);
  };
}
export function setMotionPreference(preference: MotionPreference) {
  document.documentElement.dataset.motionPreference = preference;
  document.documentElement.dataset.motion = isMotionAllowed() ? "on" : "off";
  try { localStorage.setItem("alter-motion", preference); } catch { /* Retain the root attributes for this page session. */ }
  window.dispatchEvent(new Event("alter-motion-change"));
}
export function useMotionAllowed() { return useSyncExternalStore(subscribe, isMotionAllowed, serverSnapshot); }
