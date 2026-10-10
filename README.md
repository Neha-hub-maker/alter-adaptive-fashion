# ALTER

**Dress for the hour you're in.**

ALTER is a fictional adaptive fashion and lifestyle brand for a UX design portfolio. Its foundation is minimal, editorial, urban and unisex: bright, airy Day and dark, monochrome Night.

The project includes the foundation, a time-aware hero homepage, an accessible site header, an adaptive concept collection with quick views and a bag counter, a reusable decorative video component and a temporary `/style-guide` route. Story remains a clearly marked placeholder. Checkout, a cart drawer and scroll animations are not implemented. Framer Motion and GSAP are installed for later work and are not imported.

## Development

Use Node.js 24 LTS and npm. Dependencies are pinned in `package-lock.json`.

```sh
npm ci
npm run dev
```

`npm run dev` and `npm run build` automatically generate optimized images through the `predev` and `prebuild` hooks. Existing WebP files newer than their source JPEGs are skipped, so repeat runs are fast. You can still run `npm run optimize-images` directly.

Open `/` for the homepage or `/style-guide` for the design reference. No environment variables, credentials, database or external services are required. Fonts are bundled through `next/font/local`, so development and production builds do not fetch Google Fonts.

```sh
npm run lint
npm run typecheck
npm run build
npm test
npm run test:browser
```

`typecheck` generates Next.js route types before running TypeScript. `npm test` checks time boundaries, phase labels, demo-hour parsing, bootstrap behavior, image/video metadata, product validity (including the no-branded-images rule), combined filters, stable adaptive sorting, USD formatting, asset paths and all 48 WebP outputs; run dev, build or the image optimizer first. The browser suite starts and stops its own production server on port 3100, so build first and leave that port free. It uses system Chromium at `/usr/bin/chromium`; set `CHROMIUM_PATH` to another installed Chromium binary if needed. It checks all eight style-guide theme/accent combinations with axe, homepage and quick-view accessibility in both moods, the minute clock, preferences and denied storage, mobile-menu and quick-view keyboard behavior, collection filters and empty states, required sizes, bag persistence, reduced motion, image loading, video playback/fallbacks and responsive layouts. Automated checks complement manual visual and screen-reader review.

For production: run `npm run build`, then `npm start`. Vercel's default Next.js build command, `npm run build`, runs `prebuild` automatically, so fresh-clone deployments include the optimized images without a custom build command. Generated WebP files remain ignored by Git; the raw JPEGs remain versioned and unchanged.

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

The root `<html>` has `data-theme="day|night"`, `data-theme-mode="auto|day|night"` and `data-accent="petrol|magenta|camel|gold"`. **Auto is the default:** Day from **06:00 through 17:59**, Night from **18:00 through 05:59**, using the visitor's local clock. `prefers-color-scheme` no longer chooses the mood. An inline bootstrap resolves the clock or saved choice before paint; the hero's media visibility also uses these root attributes, so the correct theme appears before hydration.

Choosing Day or Night saves the override under `alter-theme`; choosing Auto removes that key. `alter-accent` still stores the accent. If storage is denied, choices work in memory for the current page session. The shared store in `src/lib/theme.ts` broadcasts the existing `alter-theme-change` event; `useTheme` is consumed by the header, hero and original controls. Auto re-checks at each minute boundary and when the tab regains focus/visibility. Manual overrides are preserved through those checks. Labels and the live clock update once a minute without continuous screen-reader announcements.

Use `/?hour=9` or `/?hour=19` (also supported on `/style-guide`) to demo Auto at a specific hour. Only integer values **0–23** are accepted; empty, fractional, negative, out-of-range or nonnumeric values are ignored. Manual Day/Night overrides take precedence. The demo affects Auto's theme and phase, while the displayed local time remains the real local time. Return to Auto to see a demo when a manual preference has been saved.

Typed helpers `resolveTheme(hour)` and `getPhaseLabel(hour)` are exported from `src/lib/theme.ts`. Morning is 06:00–11:59, Afternoon 12:00–17:59, Evening 18:00–21:59, and Late 22:00–05:59.

Native, labeled Auto/Day/Night radio groups provide keyboard behavior and selected state. Auto displays its current Day/Night mood. Color, background-color and border-color transitions last 400ms; `prefers-reduced-motion: reduce` removes them. Background videos fade in over their posters in 400ms when motion is allowed; hero mood layers crossfade in 600ms. No motion-library behavior is implemented.

### Header and homepage hero

The sticky, opaque header shares the same mood control with the style guide. Collection and Story link to homepage anchors, including when navigating from the style guide. Below 768px, Menu opens a full-screen native modal dialog with background content made inert, an explicit keyboard focus loop, Escape/Close dismissal, scroll locking and focus restoration. Resizing into desktop navigation also closes the panel. The first focusable element is the Skip to content link.

The Day hero reuses `BackgroundVideo` with `hero-day-street-walk` and the mobile `hero-day-street-walk-portrait` variant, with priority loading. Night uses `texture-blue-silk-loop` with a dark overlay and the optimized `street-night-allwhite` photo on the right from 768px up. Only the active mood video plays; inactive media uses `preload="none"` and retains its last frame for the crossfade. Both media layers use CSS visibility via theme attributes before hydration. Reduced motion switches layers instantly and shows video posters; Save-Data also uses posters. Hero copy stays Ivory over the existing dark gradient, with a worst-case normal-text contrast of 6.97:1. The right-side Night photo is outside the text area.

The hero's phase label follows the effective hour; its clock shows real local time. Its collection button targets the concept collection and its story link targets the minimal Story placeholder, explicitly marked in source for replacement in a later task.

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

## Collection

`src/data/products.ts` exports nine fictional `Product` records with `id`, `name`, numeric USD `price`, `category`, Day/Night `mood`, `imageFile`, a short `description`, three `details`, available `sizes` and labelled `colors` (`name` plus an existing palette `token`). Accessories use `["One size"]`; sizes are still explicitly selected. The copy describes imagined garments, while the stock photographs provide editorial references rather than exact product depictions. The collection shows the visible note: **"Concept collection for a portfolio project. Product photography is stock imagery."**

Product images must reference existing entries in `images.ts` with **`thirdPartyBranding: false`**. A unit test enforces this for every record, along with unique IDs, positive prices and valid categories, moods and palette tokens. Do not substitute branded photography when extending the catalog.

`filterProducts({ mood?, category? })` combines optional filters with AND. The Mood and Category controls are independent of the current site theme and show all pieces initially. `sortForTheme(products, theme)` places matching pieces first, preserves the incoming order within both groups and returns a new array. Theme changes immediately update the leading edit and sorting without clearing filters; no card movement or filtering animation is applied. `formatPrice(price)` uses `Intl.NumberFormat` with `en-US` and `USD`.

The collection reuses `.canvas` and the 12-column `.editorial-grid`: two cards across on mobile, three from 768px, and four tracks from 1024px, with the leading card spanning two tracks and two rows on desktop. Each image reserves a 4:5 frame and uses lazy-loaded optimized WebP assets with sizes matched to the grid. The result count is announced politely; an empty result offers Clear filters and restores focus to the All mood control.

Each card opens a native quick-view dialog with the original image description, garment details, labelled colour choices and a required size group. Missing size selection shows an inline error and focuses that group. The modal shares the header's focus-wrap and scroll-lock helpers, closes with Escape, Close or a desktop backdrop click, and returns focus to its opening card. On mobile it fills the viewport and scrolls internally. Successful additions announce the piece and size inside the dialog for five seconds.

The shared bag store in `src/lib/bag.ts` persists `{ version: 1, count, items }` under **`alter-bag`**. Each addition records a `productId`, `size` and palette `colorToken`; adding the same variant twice counts as two items. Restored entries are validated against the catalog, and the count is derived from valid items. Malformed or denied storage falls back to memory for the current page session. Bag counters in the header and mobile menu stay in sync; on the homepage they scroll to Collection. On the style guide they display the count only. This is a portfolio interaction with no checkout or payment flow.

## Image rules

The uploaded archives are asset inputs, not implementation instructions. The 16 requested JPEGs are kept in `public/images/raw/`; clips and matching posters live in `public/video/`.

`npm run optimize-images` uses Sharp to auto-orient each source and output WebP at exactly **800, 1400 and 2200px widths**, preserving aspect ratio, at quality 82. Filenames follow `public/images/optimized/<basename>-<width>.webp`. Processing is sequential with limited Sharp concurrency for modest memory use. Each variant is skipped when it exists and is newer than its source; missing, older or equally dated outputs are regenerated. Delete an output to force regeneration after changing encoder settings. Dev and build run this command automatically. The command fails if the raw directory is missing or empty. The 2200px variants necessarily upscale some narrower originals; do not interpret them as additional source detail. The sample gallery uses an 800px source, responsive Next.js Image delivery and a deliberate 4:5 crop; choose an appropriate larger source for larger placements.

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

// Reusable placement pattern; the homepage implementation is in HomeHero.
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

`BackgroundVideo` accepts `id`, optional `portraitId`, `className`, `overlay` (`none`, `light`, `dark`; default `dark`), `priority` (default `false`) and `active` (default `true`). Below 768px, a supplied portrait ID switches both the clip and poster; a non-portrait alternate is rejected. CSS reserves the correct aspect ratio before hydration. The video is muted, looping, inline, hidden from assistive technology and has no controls or focus stop. It plays only while active, intersecting the viewport and the document is visible, pauses when hidden, and retains its poster if autoplay is rejected or media fails. The first successful playback fades over the poster. Priority changes active video preload from `metadata` to `auto` and makes the poster load eagerly; it does not bypass visibility or preference checks. Inactive layers preload no video and retain paused frames for crossfades.

Before preferences are checked, server output contains only the responsive poster. Reduced motion or the browser's Save-Data flag prevents video mounting and MP4 requests. Changes to those preferences are honored while the page is open. A browser without IntersectionObserver retains the poster rather than starting uncontrolled playback.

For overlay text, pair **Ivory text with `dark`** and **Ink text with `light`**, regardless of the theme. Both gradients use existing Ink/Ivory tokens, with minimum opacity chosen to exceed WCAG AA normal-text contrast even over the worst-case white or black frame. Position readable text as a sibling above the decorative component, not inside its `aria-hidden` wrapper. `none` preserves unaltered footage in the motion-library gallery and requires separate contrast treatment if text is added later.

The style guide groups all seven references by Day, Dusk and Night. Its landscape hero demonstrates the responsive portrait alternative; the portrait reference also has its own captioned entry.
