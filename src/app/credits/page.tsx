import { imageCredits, videoCredits } from "@/data/credits";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Credits", "/credits", "Photography, video and source credits for ALTER, a fictional UX portfolio brand.");
export default function Credits() {
  return <main id="main-content" tabIndex={-1} className="canvas py-6 md:py-10 credits-page">
    <p className="label text-muted mb-3">ALTER / Credits</p><h1>Behind the imagery.</h1>
    <p className="my-3 max-w-[65ch]">The photos and videos come from Pexels under the <a href="https://www.pexels.com/license/" className="underline">Pexels licence</a>. All products, brand details and collection descriptions are fictional, created for a UX design portfolio.</p>
    <section className="guide-block" aria-labelledby="photo-credits-title"><h2 id="photo-credits-title">Photography</h2><p className="my-3 text-small text-muted">These credits cover the originals and their optimized WebP variants, including the social preview derived from editorial-bw-suit.jpg. Photographer handles are supplied as text.</p>
      <ul className="credit-list">{imageCredits.map((credit) => <li key={credit.file} className="border-b py-3"><p className="font-label text-small">{credit.file}</p><p className="mt-1">Photographer: {credit.creator}</p></li>)}</ul>
    </section>
    <section className="guide-block" aria-labelledby="video-credits-title"><h2 id="video-credits-title">Video and poster stills</h2><p className="my-3 text-small text-muted">Each poster is credited with its matching clip. Creator names still need to be added by the site owner.</p>
      <ul className="credit-list">{videoCredits.map((credit) => <li key={credit.file} className="border-b py-3"><p className="font-label text-small">{credit.file.replace("/video/", "")}</p><p className="text-small">Poster: {credit.poster.replace("/video/", "")}</p><p className="mt-1">Pexels video ID: {credit.pexelsId}</p><p>Creator: {credit.creator}</p></li>)}</ul>
    </section>
  </main>;
}
