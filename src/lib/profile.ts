"use client";

import { useSyncExternalStore } from "react";
import { products } from "../data/products.ts";
import { clearProfile, recordVisit, recordView, sanitizeProfile, type VisitorProfile } from "./profile-model.ts";
import { demoPresets, getDemoPreset, type DemoPreset } from "./adaptation.ts";
import { refreshTheme, setDemoTheme } from "./theme.ts";
export { clearProfile, recordVisit, recordView, sanitizeProfile, type VisitorProfile } from "./profile-model.ts";

interface ProfileSnapshot { profile: VisitorProfile; enabled: boolean; ready: boolean; demo: DemoPreset | null }
const neutral: ProfileSnapshot = { profile: clearProfile(), enabled: true, ready: false, demo: null };
let snapshot = neutral;
let realProfile = clearProfile();
let realEnabled = true;
let demoProfile = clearProfile();
let initialized = false;
let sessionCounted = false;
const listeners = new Set<() => void>();

function emit() {
  document.documentElement.dataset.personalization = snapshot.enabled ? "on" : "off";
  document.documentElement.dataset.hasRecent = snapshot.enabled && snapshot.profile.recentlyViewed.length ? "true" : "false";
  for (const listener of listeners) listener();
}
function save() {
  try { localStorage.setItem("alter-profile", JSON.stringify(realProfile)); } catch { /* Keep the profile in memory. */ }
}
function visit() {
  if (!realEnabled || sessionCounted) return;
  try { sessionCounted = sessionStorage.getItem("alter-visit-counted") === "1"; } catch { /* Page-session flag below still prevents duplicate mounts. */ }
  if (sessionCounted) return;
  realProfile = recordVisit(realProfile, new Date().toISOString());
  sessionCounted = true;
  try { sessionStorage.setItem("alter-visit-counted", "1"); } catch { /* Memory flag is the fallback. */ }
  save();
}
function initialize() {
  if (initialized) return;
  initialized = true;
  let needsRepair = false;
  try { realEnabled = localStorage.getItem("alter-personalization") !== "off"; } catch { /* Default On. */ }
  try {
    const stored = localStorage.getItem("alter-profile");
    realProfile = sanitizeProfile(JSON.parse(stored ?? "null"));
    needsRepair = stored !== null && stored !== JSON.stringify(realProfile);
  } catch { realProfile = clearProfile(); needsRepair = true; }
  const preset = getDemoPreset(window.location.search);
  if (!preset) {
    const loaded = realProfile;
    visit();
    if (realEnabled && needsRepair && realProfile === loaded) save();
  }
  snapshot = { profile: realEnabled ? realProfile : clearProfile(), enabled: realEnabled, ready: true, demo: null };
  if (preset) startDemo(preset);
  else emit();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  initialize();
  return () => { listeners.delete(listener); };
}
export function getProfileSnapshot() { return snapshot; }
export function useProfile() { return useSyncExternalStore(subscribe, getProfileSnapshot, () => neutral); }
export function viewProduct(id: string) {
  initialize();
  if (!snapshot.enabled) return;
  const product = products.find((piece) => piece.id === id);
  if (!product) return;
  const profile = recordView(snapshot.profile, product);
  if (!snapshot.demo) { realProfile = profile; save(); }
  else demoProfile = profile;
  snapshot = { ...snapshot, profile };
  emit();
}
export function setPersonalization(enabled: boolean) {
  initialize();
  if (snapshot.demo) snapshot = { ...snapshot, enabled, profile: enabled ? demoProfile : clearProfile() };
  else {
    realEnabled = enabled;
    try { localStorage.setItem("alter-personalization", enabled ? "on" : "off"); } catch { /* Memory-only setting. */ }
    if (enabled) visit();
    snapshot = { ...snapshot, enabled, profile: enabled ? realProfile : clearProfile() };
  }
  emit(); refreshTheme();
}
export function resetProfile() {
  initialize();
  let scope: "device" | "memory" | "demo" = "demo";
  if (!snapshot.demo) {
    realProfile = clearProfile();
    scope = "device";
    try { localStorage.removeItem("alter-profile"); } catch { scope = "memory"; }
  }
  else demoProfile = clearProfile();
  snapshot = { ...snapshot, profile: clearProfile() };
  emit();
  return scope;
}
export function clearRecentlyViewed() {
  initialize();
  const profile = { ...snapshot.profile, recentlyViewed: [], viewedAtVisit: {} };
  if (!snapshot.demo && snapshot.enabled) { realProfile = profile; save(); }
  else if (snapshot.demo) demoProfile = profile;
  snapshot = { ...snapshot, profile }; emit();
}
export function startDemo(preset: DemoPreset) {
  initialize();
  let profile: VisitorProfile = { ...clearProfile(), visitCount: demoPresets[preset].visits, lastVisitAt: demoPresets[preset].visits ? new Date().toISOString() : "" };
  for (const id of demoPresets[preset].views) profile = recordView(profile, products.find((piece) => piece.id === id)!);
  demoProfile = profile;
  snapshot = { profile, enabled: true, ready: true, demo: preset };
  setDemoTheme(preset); emit(); refreshTheme();
}
export function exitDemo() {
  if (!snapshot.demo) return;
  snapshot = { profile: realEnabled ? realProfile : clearProfile(), enabled: realEnabled, ready: true, demo: null };
  const url = new URL(window.location.href);
  url.searchParams.delete("demo");
  window.history.replaceState(window.history.state, "", url);
  emit(); setDemoTheme(null);
}
