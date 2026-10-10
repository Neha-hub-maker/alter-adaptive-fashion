"use client";
import { useEffect, useRef, useState } from "react";
import type { VideoMetadata } from "@/data/videos";
import { playbackEntries, syncPlayback, schedulePlayback, cancelPlaybackFrame, type PlaybackEntry } from "@/lib/video-playback";

export default function PlaybackVideo({ asset, priority, active }: { asset: VideoMetadata; priority: boolean; active: boolean }) {
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
        window.removeEventListener("scroll", schedulePlayback); cancelPlaybackFrame();
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
