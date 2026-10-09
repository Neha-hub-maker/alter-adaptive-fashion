"use client";

import Image from "next/image";
import { BackgroundVideo } from "@/components/background-video";
import { optimizedImagePath } from "@/data/images";
import { getPhaseLabel } from "@/lib/theme";
import { useTheme } from "@/lib/use-theme";

export function HomeHero() {
  const { theme, hour, time } = useTheme();
  return (
    <section aria-labelledby="hero-title" className="home-hero">
      <div className="hero-layer hero-layer-day" aria-hidden="true">
        <BackgroundVideo id="hero-day-street-walk" portraitId="hero-day-street-walk-portrait" overlay="dark" priority active={theme === "day"} className="hero-video" />
      </div>
      <div className="hero-layer hero-layer-night" aria-hidden="true">
        <BackgroundVideo id="texture-blue-silk-loop" overlay="dark" priority active={theme === "night"} className="hero-video" />
        <div className="hero-night-photo hidden md:block">
          <Image src={optimizedImagePath("street-night-allwhite.jpg", 1400)} alt="" fill sizes="36vw" className="object-cover" />
          <div className="hero-photo-shade" />
        </div>
      </div>
      <div className="canvas hero-content">
        <p className="label mb-3 flex flex-wrap items-center gap-2">
          <span>{hour === undefined ? "Your hour" : getPhaseLabel(hour)} / <span className="day-edit">Day edit</span><span className="night-edit">Night edit</span></span>
          <span aria-hidden="true">—</span>
          <time dateTime={time || undefined}>{time || "--:--"}</time><span className="sr-only">local time</span>
        </p>
        <h1 id="hero-title" className="hero-headline">Dress for the<br />hour you&apos;re in.</h1>
        <p className="mb-4 mt-3 max-w-[45ch]">An adaptive wardrobe for every hour of the city.</p>
        <div className="flex flex-wrap items-center gap-3">
          <a href="#collection" className="hero-button label">Explore the collection</a>
          <a href="#story" className="text-small underline underline-offset-4">Our story</a>
        </div>
      </div>
    </section>
  );
}
