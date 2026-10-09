"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { getVideoById, type VideoMetadata } from "@/data/videos";

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

function PlaybackVideo({ asset, priority, active }: { asset: VideoMetadata; priority: boolean; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    // A browser without IntersectionObserver stays on the poster.
    if (!video || !window.IntersectionObserver) return;
    // Restore the source after React's development Strict Mode cleanup/re-setup.
    if (video.getAttribute("src") !== asset.src) video.src = asset.src;
    let visible = false;
    let disposed = false;
    const sync = () => {
      if (active && visible && document.visibilityState === "visible") {
        void video.play().catch(() => {
          // Autoplay can be rejected; leave the poster visible and avoid an unhandled rejection.
          if (!disposed) setPlaying(false);
        });
      } else {
        video.pause();
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(video);
    video.addEventListener("canplay", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      video.removeEventListener("canplay", sync);
      video.pause();
    };
  }, [asset.src, active]);

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
      src={asset.src}
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
      {mode === "motion" && <PlaybackVideo key={selected.id} asset={selected} priority={priority} active={active} />}
      {overlay !== "none" && <div className="background-video-overlay" data-overlay={overlay} />}
    </div>
  );
}
