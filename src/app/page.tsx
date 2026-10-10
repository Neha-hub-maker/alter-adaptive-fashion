import { pageMetadata } from "@/lib/seo";
import { HomeHero } from "@/components/home-hero";
import { CollectionSection } from "@/components/collection-section";
import { StorySection } from "@/components/story-section";

export const metadata = { ...pageMetadata("Dress for the hour you're in.", "/"), title: { absolute: "Dress for the hour you're in. | ALTER" } };

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <HomeHero />
      <CollectionSection />
      <StorySection />
    </main>
  );
}
