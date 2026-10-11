"use client";
import type { VideoMetadata } from "@/data/videos";

export interface PlaybackEntry { video: HTMLVideoElement; asset: VideoMetadata; visible: boolean; ratio: number; active: boolean; failed: () => void }
export const playbackEntries = new Set<PlaybackEntry>();
let playbackFrame = 0;
export function cancelPlaybackFrame() { cancelAnimationFrame(playbackFrame); playbackFrame = 0; }
export function syncPlayback() {
  const dusk = document.documentElement.dataset.duskActive === "true";
  const candidates = [...playbackEntries].filter((entry) => entry.active && entry.visible && document.visibilityState === "visible" && (!dusk || entry.asset.role === "transition"));
  candidates.sort((a, b) => {
    // Let the smaller Story insert take over once most of it is visible, rather
    // than having the pinned background win throughout the whole second beat.
    const insert = (entry: PlaybackEntry) => window.location.pathname === "/" && entry.asset.role === "collection" && entry.ratio >= 0.6 ? 1 : 0;
    if (insert(a) !== insert(b)) return insert(b) - insert(a);
    const distance = (entry: PlaybackEntry) => { const box = entry.video.getBoundingClientRect(); return Math.abs(box.top + box.height / 2 - window.innerHeight / 2); };
    return distance(a) - distance(b);
  });
  const winner = candidates[0];
  for (const entry of playbackEntries) {
    if (entry !== winner) { entry.video.pause(); continue; }
    // Reuse the decoded responsive still, rather than downloading a second size.
    const poster = entry.video.parentElement?.querySelector<HTMLImageElement>("picture img")?.currentSrc;
    if (poster && entry.video.poster !== poster) entry.video.poster = poster;
    if (entry.video.getAttribute("src") !== entry.asset.src) entry.video.src = entry.asset.src;
    if (entry.video.paused) void entry.video.play().catch(entry.failed);
  }
}
export function schedulePlayback() {
  if (playbackFrame) return;
  playbackFrame = requestAnimationFrame(() => { playbackFrame = 0; syncPlayback(); });
}
