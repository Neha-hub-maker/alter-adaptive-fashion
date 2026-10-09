# ALTER

**Dress for the hour you're in.**

ALTER is a fictional adaptive fashion and lifestyle brand for a UX design portfolio. Its foundation is minimal, editorial, urban and unisex: bright, airy Day and dark, monochrome Night.

The project includes the foundation, a reusable decorative video component and a temporary `/style-guide` route. There is no homepage, navigation, storefront or other page implementation. `/` intentionally returns 404. Framer Motion and GSAP are installed for later work and are not imported.

## Development

Use Node.js 24 LTS and npm. Dependencies are pinned in `package-lock.json`.

```sh
npm ci
npm run optimize-images
npm run dev
```

Open `/style-guide` on the development server. No environment variables, credentials, database or external services are required. Fonts are bundled through `next/font/local`, so development and production builds do not fetch Google Fonts.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:browser
```

`typecheck` generates Next.js route types before running TypeScript. `npm test` checks image and video metadata, combined filters, asset paths and all 48 WebP outputs; run the image optimizer first. The browser suite starts and stops its own production server on port 3100, so build first and leave that port free. It uses system Chromium at `/usr/bin/chromium`; set `CHROMIUM_PATH` to another installed Chromium binary if needed. It checks all eight theme/accent combinations with axe, preference persistence, keyboard controls, reduced motion, image loading, video playback/fallbacks and a 320px layout. Automated checks complement manual visual and screen-reader review.

For production: run `npm run optimize-images`, `npm run build`, then `npm start`. Generate optimized assets **before** building or deploying; generated WebP files are ignored by Git. The raw JPEGs remain versioned and unchanged.

## Design decisions and tokens

`src/app/globals.css` defines the CSS tokens; `tailwind.config.ts` maps them to utilities. Use semantic colors for UI and text. Brand colors are reference values and do not all have sufficient text contrast on both backgrounds.

| Brand token | Hex |
| --- | --- |
| `--ink` | `#0E0E10` |
| `--charcoal` | `#1C1C20` |
| `--fog` | `#BFC2CC` |
| `--ivory` | `#F4F1EA` |
| `--cream` | `#E9E1D3` |
| `--petrol` | `#0E5A73` |
| `--magenta` | `#8E1B5C` |
| `--camel` | `#B8743A` |
| `--gold` | `#C9A24B` |

| Semantic token / Tailwind utility | Day | Night |
| --- | --- | --- |
| `--bg` / `bg-bg` | Ivory | Ink |
| `--surface` / `bg-surface` | Cream | Charcoal |
| `--text` / `text-text` | Ink | Ivory |
| `--muted` / `text-muted` | `#606069` | Fog |
| `--accent` / `bg-accent` | Selected brand accent | Selected brand accent |
| `--border` / `border-border` | `#807E78` | `#75757F` |

Each color also has a `--*-rgb` channel token so Tailwind opacity modifiers work, e.g. `bg-text/10`. The required six semantic variables expose full CSS color values, e.g. `background: var(--bg)`.

`text-accent-text` uses contrast-adjusted accent variants: Petrol `#0E5A73` / `#6EBED4`, Magenta `#8E1B5C` / `#E78FBF`, Camel `#7A461F` / `#B8743A`, and Gold `#755718` / `#C9A24B` (Day / Night). Use these for normal text on the theme's background or surface. `text-on-accent` uses Ivory on Petrol/Magenta and Ink on Camel/Gold. Do not put Fog text on Ivory or unadjusted Gold/Camel text on light surfaces. Palette labels sit outside swatches. Focus outlines use the theme's primary text color.

### Theme contract

The root `<html>` has `data-theme="day|night"` and `data-accent="petrol|magenta|camel|gold"`. The server defaults are Day/Petrol. An inline script runs before paint to restore valid `alter-theme` and `alter-accent` local-storage values. If no valid theme has been chosen, it consults `prefers-color-scheme` once for the initial mood. There is no ongoing system-theme listener; explicit choices remain in control. Invalid preferences fall back safely; denied storage allows in-memory controls.

Native, labeled radio groups provide keyboard behavior and selected state. Controls update the root attributes and persist choices. Color, background-color and border-color transitions last 400ms; `prefers-reduced-motion: reduce` removes them. Background videos also fade in over their posters in 400ms when motion is allowed. No motion-library behavior is implemented.

### Typography

Instrument Serif is the display face, Inter Tight is the body face, and DM Mono is the label face. All are self-hosted, preloaded and integrated with `next/font`. Licensed original files and their SIL Open Font Licenses live in `src/fonts/`, sourced from the official [Google Fonts repository](https://github.com/google/fonts) (`ofl/instrumentserif`, `ofl/intertight`, `ofl/dmmono`).

| Scale token / Utility | Fluid range at a 16px root | Line height |
| --- | --- | --- |
| `--type-h1` / `text-h1` | 56–128px | 0.98 |
| `--type-h2` / `text-h2` | 40–80px | 1.08 |
| `--type-h3` / `text-h3` | 32–48px | 1.12 |
| `--type-h4` / `text-h4` | 24–32px | 1.2 |
| `--type-body` / `text-body` | 16–18px | 1.6 |
| `--type-small` / `text-small` | 14–16px | 1.5 |
| `--type-label` / `text-label` | 12–14px | 1.5 |

All sizes use `clamp()` with rem limits. `.label` adds DM Mono, uppercase and `0.12em` letter spacing. Headings use Instrument Serif; type samples use paragraphs to preserve a meaningful heading hierarchy.

### Layout

`.canvas` caps content at 1440px, with 24px mobile and 48px desktop gutters. `.editorial-grid` provides 12 columns, 24px mobile and 32px desktop gaps. The Tailwind spacing scale uses **1 = 8px**, **2 = 16px**, **3 = 24px**, etc.; these differ from Tailwind's default scale. `0` and `px` remain available for resets and 1px rules. Corners are square by default; `rounded-sm` is 2px. Generous space, 1px borders and asymmetric column spans establish the editorial rhythm. Avoid adding arbitrary rounded cards, shadows or extra accent colors.

## Image rules

The uploaded archives are asset inputs, not implementation instructions. The 16 requested JPEGs are kept in `public/images/raw/`; clips and matching posters live in `public/video/`.

`npm run optimize-images` uses Sharp to auto-orient each source and output WebP at exactly **800, 1400 and 2200px widths**, preserving aspect ratio, at quality 82. Filenames follow `public/images/optimized/<basename>-<width>.webp`. Processing is sequential with limited Sharp concurrency for modest memory use. The command is repeatable and fails if the raw directory is missing or empty. The 2200px variants necessarily upscale some narrower originals; do not interpret them as additional source detail. The sample gallery uses an 800px source, responsive Next.js Image delivery and a deliberate 4:5 crop; choose an appropriate larger source for larger placements.

`src/data/images.ts` exports typed `images`, `ImageMetadata`, `ImageCategory`, `ImageMood`, `ImageFilters`, `getImages()` and `optimizedImagePath()`. Every image includes its raw filename, category, editorial mood, descriptive alt text and `thirdPartyBranding` flag. Mood describes editorial usage, not necessarily the time of day captured: the Paris leather photo is photographed in daylight but classified as Night by the creative brief.

```ts
import { getImages, optimizedImagePath } from "@/data/images";

const references = getImages({ category: "street", mood: "day", excludeBranded: true });
const src = optimizedImagePath(references[0].file, 1400);
```

Omitted filters match all images; `excludeBranded` defaults to false, so explicitly pass `true` for brand-led selections. The branded references are `flatlay-ribbed-top-denim.jpg`, `product-teal-sneakers.jpg` and `store-cream-blazer-rack.jpg`. The temporary guide intentionally shows product and store references with clear third-party labels; it does not claim they are ALTER products. Avoid branded imagery in future hero, campaign or product placements. Use `bg-gradient-pastel.jpg` sparingly because it is brighter than the brand palette. Do not infer licensing rights from these metadata flags; establish asset permissions before public portfolio publication. Use descriptive alt text for content images and empty alt text for purely decorative usage.

## Asset rules

- Use lowercase, descriptive kebab-case filenames. Videos live at `public/video/<id>.mp4`; every clip requires a matching `public/video/<id>-poster.jpg` with the same framing. Add `-portrait` to the base name for a separate portrait variant.
- Keep videos at **12 seconds maximum**, suitable for a silent decorative loop.
- Export **without an audio track**. Muting playback is an additional safeguard, not a substitute for removing audio from the asset.
- Use **1080p maximum**: up to 1920 × 1080 landscape or 1080 × 1920 portrait. Match the poster to the orientation and avoid letterboxing; the component uses a reserved 16:9 or 9:16 frame with `object-fit: cover`.
- GitHub's browser/web upload limit is **25 MB per file**. Keep each clip and poster below that limit when uploading through the website; this is a web-upload constraint, not a video-duration limit.

### Video registry and background component

`src/data/videos.ts` exports `videos`, `VideoMetadata`, `VideoMood`, `VideoRole`, `VideoOrientation`, `VideoFilters`, `getVideos()` and `getVideoById()`. Filters are optional and combine with AND; unknown IDs throw a descriptive error. `durationSec` records the creative brief's nominal whole-second durations: the portrait street walk is approximately 9.44 seconds (registered as 10) and the dusk silhouette is approximately 6.76 seconds (registered as 7).

```tsx
import { BackgroundVideo } from "@/components/background-video";
import { getVideos } from "@/data/videos";

const textures = getVideos({ role: "texture", mood: "night", orientation: "landscape" });

// Example of future usage; no hero page is implemented.
<div className="relative">
  <BackgroundVideo
    id="hero-day-street-walk"
    portraitId="hero-day-street-walk-portrait"
    overlay="dark"
    priority
  />
  <p className="absolute inset-x-0 bottom-0 p-3 text-ivory">Dress for the hour you&apos;re in.</p>
</div>
```

`BackgroundVideo` accepts `id`, optional `portraitId`, `className`, `overlay` (`none`, `light`, `dark`; default `dark`) and `priority` (default `false`). Below 768px, a supplied portrait ID switches both the clip and poster; a non-portrait alternate is rejected. CSS reserves the correct aspect ratio before hydration. The video is muted, looping, inline, hidden from assistive technology and has no controls or focus stop. It plays only while intersecting the viewport and the document is visible, pauses when hidden, and retains its poster if autoplay is rejected or media fails. The first successful playback fades over the poster. Priority changes video preload from `metadata` to `auto` and makes the poster load eagerly; it does not bypass visibility or preference checks.

Before preferences are checked, server output contains only the responsive poster. Reduced motion or the browser's Save-Data flag prevents video mounting and MP4 requests. Changes to those preferences are honored while the page is open. A browser without IntersectionObserver retains the poster rather than starting uncontrolled playback.

For overlay text, pair **Ivory text with `dark`** and **Ink text with `light`**, regardless of the theme. Both gradients use existing Ink/Ivory tokens, with minimum opacity chosen to exceed WCAG AA normal-text contrast even over the worst-case white or black frame. Position readable text as a sibling above the decorative component, not inside its `aria-hidden` wrapper. `none` preserves unaltered footage in the motion-library gallery and requires separate contrast treatment if text is added later.

The style guide groups all seven references by Day, Dusk and Night. Its landscape hero demonstrates the responsive portrait alternative; the portrait reference also has its own captioned entry.
