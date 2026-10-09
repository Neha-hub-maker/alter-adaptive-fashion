import type { Metadata } from "next";
import Image from "next/image";
import { ThemeControls } from "@/components/theme-controls";
import { getImages, imageCategories, optimizedImagePath } from "@/data/images";
import { BackgroundVideo } from "@/components/background-video";
import { getVideos, videoMoods } from "@/data/videos";

export const metadata: Metadata = { title: "ALTER — Style Guide", robots: { index: false, follow: false } };

const palette = [
  ["Ink", "#0E0E10"], ["Charcoal", "#1C1C20"], ["Fog", "#BFC2CC"],
  ["Ivory", "#F4F1EA"], ["Cream", "#E9E1D3"], ["Petrol", "#0E5A73"],
  ["Magenta", "#8E1B5C"], ["Camel", "#B8743A"], ["Gold", "#C9A24B"],
] as const;
const semanticTokens = ["bg", "surface", "text", "muted", "accent", "border"] as const;

export default function StyleGuide() {
  return (
    <main id="main-content" tabIndex={-1} className="canvas py-6 md:py-10">
      <div className="editorial-grid pb-6 md:pb-10">
        <div className="col-span-12 md:col-span-8">
          <p className="label mb-3 text-muted">ALTER / Foundation study / 01</p>
          <h1>Dress for the<br />hour you&apos;re in.</h1>
          <p className="mt-3 max-w-[42ch] text-muted">A living reference for a minimal, editorial, urban wardrobe. Two moods. One foundation.</p>
        </div>
        <div className="col-span-12 self-end md:col-span-4">
          <p className="label mb-2">Style guide</p>
          <p className="text-small text-muted">Fictional fashion &amp; lifestyle brand.<br />UX design portfolio project.</p>
        </div>
      </div>

      <section aria-labelledby="mood-title" className="guide-block editorial-grid">
        <div className="col-span-12 md:col-span-4">
          <p className="label mb-2 text-muted">01 / Appearance</p>
          <h2 id="mood-title">Set the hour.</h2>
        </div>
        <div className="col-span-12 md:col-span-8">
          <ThemeControls />
          <div className="mt-3 border border-border bg-surface p-3">
            <p className="label mb-1 text-accent-text">Active accent / Accessible text variant</p>
            <p>The palette changes. The reading experience stays clear.</p>
            <span className="label mt-2 inline-block bg-accent px-2 py-1 text-on-accent">Accent fill</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="color-title" className="guide-block">
        <div className="editorial-grid mb-4">
          <div className="col-span-12 md:col-span-4"><p className="label mb-2 text-muted">02 / Palette</p><h2 id="color-title">Quiet by design.</h2></div>
          <p className="col-span-12 self-end text-muted md:col-span-6 md:col-start-7">Neutral foundations with one deliberate accent. Swatch labels sit outside their colors to preserve contrast.</p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {palette.map(([name, hex]) => (
            <li key={name}>
              <div aria-hidden="true" className="mb-2 h-12 border" style={{ backgroundColor: hex }} />
              <p className="label">{name}</p><p className="text-small text-muted">{hex}</p>
            </li>
          ))}
        </ul>
        <h3 className="mb-3 mt-6">Semantic tokens</h3>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {semanticTokens.map((token) => (
            <li key={token}>
              <div aria-hidden="true" className="mb-2 h-8 border" style={{ backgroundColor: `var(--${token})` }} />
              <code className="label">--{token}</code>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="type-title" className="guide-block editorial-grid">
        <div className="col-span-12 md:col-span-4"><p className="label mb-2 text-muted">03 / Typography</p><h2 id="type-title">A little character.</h2><p className="mt-3 text-small text-muted">Instrument Serif / Display<br />Inter Tight / Body<br />DM Mono / Labels</p></div>
        <div className="col-span-12 min-w-0 space-y-4 md:col-span-8">
          <div><p className="label mb-1 text-muted">H1 / Fluid / 56–128px</p><p className="font-display text-h1">In your hour.</p></div>
          <div><p className="label mb-1 text-muted">H2 / Fluid / 40–80px</p><p className="font-display text-h2">From light to late.</p></div>
          <div><p className="label mb-1 text-muted">H3 / Fluid / 32–48px</p><p className="font-display text-h3">A change of mood.</p></div>
          <div><p className="label mb-1 text-muted">H4 / Fluid / 24–32px</p><p className="font-display text-h4">Room to be yourself.</p></div>
          <div><p className="label mb-1 text-muted">Body / Fluid / 16–18px</p><p>Pieces for the rhythm of the city, and the pauses in between. Unisex by intention. Adaptable by nature.</p></div>
          <div><p className="label mb-1 text-muted">Small / Fluid / 14–16px</p><p className="text-small">Thoughtful details. Generous space. An everyday point of view.</p></div>
          <div><p className="label mb-1 text-muted">Label / Fluid / 12–14px</p><p className="label">Day to night / ALTER studio</p></div>
        </div>
      </section>

      <section aria-labelledby="image-title" className="guide-block">
        <p className="label mb-2 text-muted">04 / Image library</p>
        <h2 id="image-title">Material &amp; mood.</h2>
        <p className="mb-4 mt-3 max-w-[65ch] text-muted">One reference per category. Third-party branded references are explicitly marked and excluded from brand-led selections by the image helper.</p>
        <div className="editorial-grid">
          {imageCategories.map((category) => {
            const sample = getImages({ category })[0];
            return (
              <figure className="col-span-12 sm:col-span-6 lg:col-span-4" key={category}>
                <Image src={optimizedImagePath(sample.file, 800)} alt={sample.alt} width={800} height={1000} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="aspect-[4/5] w-full object-cover" />
                <figcaption className="pb-3 pt-2">
                  <p className="label">{category} / {sample.mood}</p>
                  <p className="mt-1 break-words text-small text-muted">{sample.file}</p>
                  {sample.thirdPartyBranding && <p className="mt-1 text-small">Third-party branded reference — not an ALTER product.</p>}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </section>
      <section aria-labelledby="motion-title" className="guide-block editorial-grid">
        <div className="col-span-12 md:col-span-4">
          <p className="label mb-2 text-muted">05 / Motion library</p>
          <h2 id="motion-title">A quiet rhythm.</h2>
          <p className="mt-3 text-small text-muted">Clips play only while visible. With reduced motion or Save-Data enabled, only the poster is shown. All clips are silent and decorative.</p>
        </div>
        <div className="col-span-12 space-y-6 md:col-span-8">
          {videoMoods.map((mood) => (
            <div key={mood}>
              <h3 className="mb-3 capitalize">{mood}</h3>
              <div className="editorial-grid">
                {getVideos({ mood }).map((video) => (
                  <figure className="col-span-12 min-w-0 sm:col-span-6" key={video.id}>
                    <BackgroundVideo
                      id={video.id}
                      portraitId={video.id === "hero-day-street-walk" ? "hero-day-street-walk-portrait" : undefined}
                      overlay="none"
                    />
                    <figcaption className="pb-3 pt-2">
                      <p className="label break-words">{video.id}</p>
                      <p className="mt-1 text-small text-muted">{video.role} / {video.mood}</p>
                      {video.id === "hero-day-street-walk" && <p className="mt-1 text-small text-muted">Portrait variant below 768px.</p>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <p className="label border-t pt-3 text-muted">Foundation only / 12 columns / 8px rhythm / 1440px canvas</p>
    </main>
  );
}
