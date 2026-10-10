"use client";

import { useEffect, useRef } from "react";
import { BackgroundVideo } from "@/components/background-video";
import { Reveal } from "@/components/reveal";
import { useMotionAllowed } from "@/lib/use-motion-allowed";

export const storyBeats = [
  { title: "Made for the hour you're in", text: "Adaptive design starts with your rhythm. Room to move, layers to change and details that make dressing feel considered, wherever the next hour takes you." },
  { title: "One piece. Many hours.", text: "A soft shoulder over a morning tee becomes an evening silhouette with a different layer. We imagine fewer pieces, each with more ways to belong." },
  { title: "Style without a dividing line", text: "ALTER is unisex because ease, expression and good design belong to everyone. Choose a shape for how it feels on you, beyond a gendered label." },
] as const;

export function StorySection() {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();
  useEffect(() => {
    if (!allowed || !window.IntersectionObserver) return;
    let disposed = false;
    let revert: (() => void) | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      // Defer the GSAP/ScrollTrigger chunk until the story approaches the viewport.
      void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
        if (disposed) return;
        gsap.registerPlugin(ScrollTrigger);
        const media = gsap.matchMedia();
        media.add("(min-width: 768px)", () => {
          const trigger = ScrollTrigger.create({
            id: "alter-story", trigger: ref.current?.querySelector(".story-sequence"), pin: stageRef.current, pinType: "transform", pinSpacing: false,
            start: () => `top top+=${parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) + 24}`,
            end: "bottom bottom", invalidateOnRefresh: true,
          });
          stageRef.current?.setAttribute("data-pinned", "true");
          return () => { trigger.kill(true); stageRef.current?.removeAttribute("data-pinned"); };
        });
        revert = () => media.revert();
      });
    }, { rootMargin: "300px" });
    if (ref.current) observer.observe(ref.current);
    return () => { disposed = true; observer.disconnect(); revert?.(); };
  }, [allowed]);
  return <section ref={ref} id="story" aria-labelledby="story-title" className="canvas guide-block story-section">
    <Reveal className="mb-6"><p className="label text-muted mb-2">02 / Story</p><h2 id="story-title">A wardrobe that moves with you.</h2><p className="text-small text-muted mt-3">Fictional brand and concept for a UX portfolio project.</p></Reveal>
    <div className="editorial-grid story-sequence">
      <div className="col-span-12 md:col-span-7 story-media-rail"><div ref={stageRef} className="story-stage"><BackgroundVideo id="behind-the-scenes-shoot" className="story-video" overlay="dark" /><span aria-hidden="true" className="story-studio-label label">ALTER / Studio hours</span></div></div>
      <div className="col-span-12 md:col-span-5">
        {storyBeats.map((beat, index) => <article key={beat.title} className="story-beat">
          <Reveal><p className="label text-muted mb-2">0{index + 1} / Adaptive design</p><h3 className="text-h3">{beat.title}</h3><p className="mt-3">{beat.text}</p></Reveal>
          {index === 1 && <div className="mt-4"><BackgroundVideo id="boutique-hands-sweaters" overlay="none" /><p className="label text-muted mt-2">Considered, layer by layer.</p></div>}
        </article>)}
      </div>
    </div>
  </section>;
}
