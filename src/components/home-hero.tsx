"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Reveal } from "@/components/reveal";
import { durations, stagger } from "@/lib/motion";
import { useMotionAllowed } from "@/lib/use-motion-allowed";
import { BackgroundVideo } from "@/components/background-video";
import { optimizedImagePath } from "@/data/images";
import { phaseSubheads } from "@/lib/adaptation";
import { useProfile } from "@/lib/profile";
import { products } from "@/data/products";
import { useTheme } from "@/lib/use-theme";

export function HomeHero() {
  const { theme, time } = useTheme();
  const { profile, enabled } = useProfile();
  const lastPiece = products.find((piece) => piece.id === profile.recentlyViewed[0]);
  const ref = useRef<HTMLElement>(null);
  const allowed = useMotionAllowed();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "3%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.02, 1.06]);
  return (
    <section ref={ref} aria-labelledby="hero-title" className="home-hero">
      <div className="hero-media-window"><motion.div data-motion-effect className="hero-media" style={{ y: allowed ? y : 0, scale: allowed ? scale : 1 }}>
      <div className="hero-layer hero-layer-day" aria-hidden="true">
        <BackgroundVideo id="hero-day-street-walk" portraitId="hero-day-street-walk-portrait" overlay="none" priority active={theme === "day"} className="hero-video" />
      </div>
      <div className="hero-layer hero-layer-night" aria-hidden="true">
        <BackgroundVideo id="texture-blue-silk-loop" overlay="dark" priority active={theme === "night"} className="hero-video" />
        <div className="hero-night-photo hidden md:block">
          <Image src={optimizedImagePath("street-night-allwhite.jpg", 1400)} alt="" fill sizes="36vw" className="object-cover" />
          <div className="hero-photo-shade" />
        </div>
      </div>
      </motion.div></div>
      <div className="day-hero-wash" aria-hidden="true" />
      <div className="canvas hero-content">
        <p className="label flex flex-wrap items-center gap-2">
          <span><span className="unknown-phase">Your hour</span>{Object.keys(phaseSubheads).map((phase) => <span key={phase} className="phase-variant" data-phase-name={phase}>{phase}</span>)} / <span className="day-edit">Day edit</span><span className="night-edit">Night edit</span></span>
          <span aria-hidden="true">—</span>
          <time dateTime={time || undefined}>{time || "--:--"}</time><span className="sr-only">local time</span>
        </p>
        <p className="hero-welcome text-small">{enabled && profile.visitCount > 1 ? `Welcome back${lastPiece ? ` — last viewed: ${lastPiece.name}` : "."}` : ""}</p>
        <h1 id="hero-title" className="hero-headline"><Reveal tag="span" className="block" immediate>Dress for the</Reveal>{" "}<Reveal tag="span" className="block" immediate delay={stagger}>hour you&apos;re in.</Reveal></h1>
        <Reveal immediate delay={stagger + durations.base} className="mb-4 mt-3 max-w-[45ch] hero-subhead"><p><span className="neutral-subhead">An adaptive wardrobe for every hour of the city.</span>{Object.entries(phaseSubheads).map(([phase, copy]) => <span key={phase} className="phase-variant adaptive-subhead" data-phase-name={phase}>{copy}</span>)}</p></Reveal>
        <Reveal immediate delay={stagger * 2 + durations.base} className="flex flex-wrap items-center gap-3">
          <a href="#collection" className="hero-button label">Explore the collection</a>
          <a href="#story" className="text-small underline underline-offset-4">Our story</a>
        </Reveal>
      </div>
    </section>
  );
}
