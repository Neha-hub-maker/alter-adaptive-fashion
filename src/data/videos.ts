export const videoMoods = ["day", "dusk", "night"] as const;
export const videoRoles = ["hero", "transition", "collection", "story", "texture"] as const;
export type VideoMood = (typeof videoMoods)[number];
export type VideoRole = (typeof videoRoles)[number];
export type VideoOrientation = "landscape" | "portrait";

export interface VideoMetadata {
  id: string;
  src: `/video/${string}.mp4`;
  poster: `/video/${string}-poster.jpg`;
  orientation: VideoOrientation;
  /** Nominal duration from the creative brief, rounded to whole seconds. */
  durationSec: number;
  mood: VideoMood;
  role: VideoRole;
  description: string;
}

export const videos: readonly VideoMetadata[] = [
  { id: "hero-day-street-walk", src: "/video/hero-day-street-walk.mp4", poster: "/video/hero-day-street-walk-poster.jpg", orientation: "landscape", durationSec: 12, mood: "day", role: "hero", description: "An urban street walk in daylight, framed for a wide hero placement." },
  { id: "hero-day-street-walk-portrait", src: "/video/hero-day-street-walk-portrait.mp4", poster: "/video/hero-day-street-walk-portrait-poster.jpg", orientation: "portrait", durationSec: 10, mood: "day", role: "hero", description: "A portrait street-walk reference for a mobile hero placement." },
  { id: "mood-dusk-silhouette", src: "/video/mood-dusk-silhouette.mp4", poster: "/video/mood-dusk-silhouette-poster.jpg", orientation: "landscape", durationSec: 7, mood: "dusk", role: "transition", description: "A silhouette at dusk, bridging the Day and Night moods." },
  { id: "boutique-hands-sweaters", src: "/video/boutique-hands-sweaters.mp4", poster: "/video/boutique-hands-sweaters-poster.jpg", orientation: "landscape", durationSec: 12, mood: "day", role: "collection", description: "Hands browsing sweaters, emphasizing material and tactile detail." },
  { id: "boutique-browsing-portrait", src: "/video/boutique-browsing-portrait.mp4", poster: "/video/boutique-browsing-portrait-poster.jpg", orientation: "portrait", durationSec: 12, mood: "day", role: "collection", description: "Portrait footage of browsing garments in a boutique." },
  { id: "behind-the-scenes-shoot", src: "/video/behind-the-scenes-shoot.mp4", poster: "/video/behind-the-scenes-shoot-poster.jpg", orientation: "landscape", durationSec: 12, mood: "day", role: "story", description: "A behind-the-scenes fashion shoot for a studio story." },
  { id: "texture-blue-silk-loop", src: "/video/texture-blue-silk-loop.mp4", poster: "/video/texture-blue-silk-loop-poster.jpg", orientation: "landscape", durationSec: 10, mood: "night", role: "texture", description: "A loop of blue silk with shifting folds and soft highlights." },
];

export interface VideoFilters {
  role?: VideoRole;
  mood?: VideoMood;
  orientation?: VideoOrientation;
}

export function getVideos({ role, mood, orientation }: VideoFilters = {}): VideoMetadata[] {
  return videos.filter((video) =>
    (!role || video.role === role) &&
    (!mood || video.mood === mood) &&
    (!orientation || video.orientation === orientation),
  );
}

export function getVideoById(id: string): VideoMetadata {
  const video = videos.find((video) => video.id === id);
  if (!video) throw new Error(`Unknown ALTER video id "${id}". Check src/data/videos.ts for registered ids.`);
  return video;
}
