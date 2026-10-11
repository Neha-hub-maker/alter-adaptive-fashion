"use client";

import dynamic from "next/dynamic";
import { schedulePlayback } from "@/lib/video-playback";
import Image, { getImageProps } from "next/image";
import { useNearViewport } from "@/lib/use-near-viewport";
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
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

// The poster paints before this decorative player chunk is requested.
const PlaybackVideo = dynamic(() => import("./playback-video"), { ssr: false });

export function BackgroundVideo({ id, portraitId, className = "", overlay = "dark", priority = false, active = true }: BackgroundVideoProps) {
  const [containerRef, near] = useNearViewport<HTMLDivElement>(priority);
  const primary = getVideoById(id);
  const [playbackReady, setPlaybackReady] = useState(!priority || primary.role === "transition");
  useEffect(() => {
    if (!priority || primary.role === "transition") return;
    let timer: ReturnType<typeof setTimeout>;
    // Let the prioritized still and fonts paint before fetching decorative MP4s.
    const loaded = () => { timer = setTimeout(() => setPlaybackReady(true), 500); };
    if (document.readyState === "complete") loaded();
    else window.addEventListener("load", loaded, { once: true });
    return () => { window.removeEventListener("load", loaded); clearTimeout(timer); };
  }, [priority, primary.role]);
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
    <div ref={containerRef} className={`background-video ${className}`} style={style} aria-hidden="true">
      {near && <picture>
        {portrait && <source media={portraitQuery} srcSet={getImageProps({ src: portrait.poster, alt: "", fill: true, sizes: "100vw" }).props.srcSet} />}
        <Image src={primary.poster} alt="" fill sizes="100vw" onLoad={schedulePlayback} fetchPriority={priority ? "high" : undefined} loading={priority ? "eager" : "lazy"} className="object-cover" />
      </picture>}
      {/* No media element or MP4 request until browser preferences have been checked. */}
      {playbackReady && near && mode === "motion" && motionAllowed && <PlaybackVideo key={selected.id} asset={selected} priority={priority} active={active} />}
      {overlay !== "none" && <div className="background-video-overlay" data-overlay={overlay} />}
    </div>
  );
}
