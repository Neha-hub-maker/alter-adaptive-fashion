"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { getVideoById, type VideoMetadata } from "@/data/videos";
import { useMotionAllowed } from "@/lib/use-motion-allowed";

export interface BackgroundVideoProps {
  id: string;
  portraitId?: string;
  className?: string;
  overlay?: "none" | "light" | "dark";
  priority?: boolean;
  /** Pause an inactive media layer while preserving its last frame for a crossfade. */
  active?: boolean;
}

type DataConnection = EventTarget & { saveData?: boolean };
function connection(): DataConnection | undefined {
  return (navigator as Navigator & { connection?: DataConnection }).connection;
}
const portraitQuery = "(width < 768px)";
const motionQuery = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const portrait = window.matchMedia(portraitQuery);
  const motion = window.matchMedia(motionQuery);
  const network = connection();
  portrait.addEventListener("change", callback);
  motion.addEventListener("change", callback);
  network?.addEventListener("change", callback);
  return () => {
    portrait.removeEventListener("change", callback);
    motion.removeEventListener("change", callback);
    network?.removeEventListener("change", callback);
  };
}

function snapshot() {
  const still = window.matchMedia(motionQuery).matches || connection()?.saveData === true;
  const portrait = window.matchMedia(portraitQuery).matches;
  return `${still ? "still" : "motion"}:${portrait ? "portrait" : "landscape"}`;
}
function serverSnapshot() { return "pending:landscape"; }
function aspect(video: VideoMetadata) { return video.orientation === "portrait" ? "9 / 16" : "16 / 9"; }

interface PlaybackEntry { video: HTMLVideoElement; asset: VideoMetadata; visible: boolean; ratio: number; active: boolean; failed: () => void }
const playbackEntries = new Set<PlaybackEntry>();
let playbackFrame = 0;
function syncPlayback() {
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
    if (entry.video.getAttribute("src") !== entry.asset.src) entry.video.src = entry.asset.src;
    if (entry.video.paused) void entry.video.play().catch(entry.failed);
  }
}
function schedulePlayback() {
  if (playbackFrame) return;
  playbackFrame = requestAnimationFrame(() => { playbackFrame = 0; syncPlayback(); });
}

function PlaybackVideo({ asset, priority, active }: { asset: VideoMetadata; priority: boolean; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    // A browser without IntersectionObserver stays on the poster.
    if (!video || !window.IntersectionObserver) return;
    let disposed = false;
    const entry: PlaybackEntry = { video, asset, visible: false, ratio: 0, active, failed: () => { if (!disposed) setPlaying(false); } };
    playbackEntries.add(entry);
    window.addEventListener("scroll", schedulePlayback, { passive: true });
    const observer = new IntersectionObserver(([intersection]) => {
      entry.visible = intersection.isIntersecting;
      entry.ratio = intersection.intersectionRatio;
      syncPlayback();
    }, { threshold: [0, 0.6] });
    observer.observe(video);
    video.addEventListener("canplay", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    window.addEventListener("alter-media-change", syncPlayback);
    return () => {
      disposed = true;
      observer.disconnect();
      playbackEntries.delete(entry);
      if (!playbackEntries.size) {
        window.removeEventListener("scroll", schedulePlayback); cancelAnimationFrame(playbackFrame); playbackFrame = 0;
        document.removeEventListener("visibilitychange", syncPlayback);
        window.removeEventListener("alter-media-change", syncPlayback);
      }
      video.removeEventListener("canplay", syncPlayback);
      video.pause();
      syncPlayback();
    };
  }, [asset, active]);

  useEffect(() => {
    const video = ref.current;
    return () => {
      // Abort media fetches on unmount/source replacement, retaining frames when
      // only activity changes. The playback effect restores Strict Mode sources.
      video?.pause();
      video?.removeAttribute("src");
      video?.load();
    };
  }, [asset.src]);

  return (
    <video
      ref={ref}
      src={priority ? asset.src : undefined}
      poster={asset.poster}
      muted
      loop
      playsInline
      preload={active ? (priority ? "auto" : "metadata") : "none"}
      aria-hidden="true"
      tabIndex={-1}
      className="background-video-media"
      data-playing={playing}
      onPlaying={() => setPlaying(true)}
      onError={() => setPlaying(false)}
    />
  );
}

export function BackgroundVideo({ id, portraitId, className = "", overlay = "dark", priority = false, active = true }: BackgroundVideoProps) {
  const primary = getVideoById(id);
  const portrait = portraitId ? getVideoById(portraitId) : undefined;
  if (portrait && portrait.orientation !== "portrait") {
    throw new Error(`ALTER portraitId "${portraitId}" must reference a portrait video.`);
  }
  const [mode, orientation] = useSyncExternalStore(subscribe, snapshot, serverSnapshot).split(":");
  const motionAllowed = useMotionAllowed();
  const selected = orientation === "portrait" && portrait ? portrait : primary;
  const style = {
    "--video-aspect": aspect(primary),
    "--video-mobile-aspect": aspect(portrait ?? primary),
  } as CSSProperties;

  return (
    <div className={`background-video ${className}`} style={style} aria-hidden="true">
      <picture>
        {portrait && <source media={portraitQuery} srcSet={portrait.poster} />}
        <Image src={primary.poster} alt="" fill unoptimized loading={priority ? "eager" : "lazy"} className="object-cover" />
      </picture>
      {/* No media element or MP4 request until browser preferences have been checked. */}
      {mode === "motion" && motionAllowed && <PlaybackVideo key={selected.id} asset={selected} priority={priority} active={active} />}
      {overlay !== "none" && <div className="background-video-overlay" data-overlay={overlay} />}
    </div>
  );
}
