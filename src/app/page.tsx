import type { Metadata } from "next";
import { HomeHero } from "@/components/home-hero";
import { CollectionSection } from "@/components/collection-section";
import { StorySection } from "@/components/story-section";

export const metadata: Metadata = { title: "ALTER - Dress for the hour you're in." };

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <HomeHero />
      <CollectionSection />
      <StorySection />
    </main>
  );
}
