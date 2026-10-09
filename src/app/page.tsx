import type { Metadata } from "next";
import { HomeHero } from "@/components/home-hero";

export const metadata: Metadata = { title: "ALTER - Dress for the hour you're in." };

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <HomeHero />
      {/* Placeholder for the next task: collection content and product grids. */}
      <section id="collection" aria-labelledby="collection-title" className="canvas guide-block">
        <p className="label mb-2 text-muted">Collection / Coming next</p>
        <h2 id="collection-title">The collection</h2>
        <p className="mt-3 text-muted">Our collection is taking shape, with pieces for every hour of the city.</p>
      </section>
      {/* Placeholder for the next task: the ALTER brand story. */}
      <section id="story" aria-labelledby="story-title" className="canvas guide-block">
        <p className="label mb-2 text-muted">Story / Coming next</p>
        <h2 id="story-title">Our story</h2>
        <p className="mt-3 text-muted">ALTER explores how a wardrobe can move with the changing rhythm of your day.</p>
      </section>
    </main>
  );
}
