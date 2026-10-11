# Production performance report

Measured on 10 October 2026 with Lighthouse 13.5.0 and system Chromium 151 against `npm run build` / `next start`. These are local production lab results, not deployed or field Web Vitals. Neither route meets the median LCP budget yet.

## Method

Three runs per route used fresh browser storage/cache and a warmed loopback server, with no concurrent browser tests. Both URLs included `?hour=13` to make the Day edit repeatable. Motion and personalization retained their normal On defaults; no reduced-motion preference was used to improve scores.

Lighthouse used its mobile simulated throttling: 412×823 CSS pixels, DPR 1.75, 150ms RTT, 1,638.4Kbps throughput and 4× CPU slowdown. Full settings, timestamps, per-run metrics and transfer bytes are preserved in [performance-results.json](performance-results.json). The local server and image cache were warm; deployment latency and first uncached image processing were not measured. Simulated metrics differ from the fast unthrottled trace timings shown in Lighthouse's element breakdown.

## Results and budgets

Values below are medians of three runs; each metric's median is calculated independently. KiB means 1,024 bytes. “Initial JS” is Lighthouse's script transfer total during initial navigation, including any deferred player chunk requested during that recording. It excludes scripts first requested by later scrolling or opening a modal.

| Metric | Budget | `/` | `/style-guide` |
| --- | --- | ---: | ---: |
| Performance score | Report actual | 91 | 97 |
| LCP | Under 2.5s | **3.45s — missed** | **2.56s — missed** |
| CLS | Under 0.1 | 0 | 0 |
| TBT | Low; lab target under 200ms | 74ms | 104ms |
| FCP | Report actual | 0.91s | 0.91s |
| Initial JS transfer | State total; no new threshold assigned | 206,808 B / 202.0 KiB | 205,635 B / 200.8 KiB |
| Total initial transfer | Report actual | 1,170,321 B / 1,142.9 KiB | 329,577 B / 321.9 KiB |

| Route/run | Performance | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: |
| Home 1 | 91 | 3.458s | 0 | 85ms |
| Home 2 | 94 | 3.032s | 0 | 31ms |
| Home 3 | 91 | 3.449s | 0 | 74ms |
| Style guide 1 | 98 | 2.262s | 0 | 104ms |
| Style guide 2 | 94 | 2.915s | 0 | 123ms |
| Style guide 3 | 97 | 2.563s | 0 | 62ms |

Accessibility and Best Practices scored 100 in all six runs. SEO scored 66 on Home and 69 on the style guide because indexing is deliberately blocked; `is-crawlable` was the only scored SEO failure. These scores do not establish accessibility conformance or search visibility. The separate production indexing smoke test verifies the optional indexable build while keeping the style guide excluded.

The mobile hero poster was identified as Home's LCP element; the style-guide h1 was its LCP element. Lighthouse confirms that the hero poster is discoverable in the initial HTML, loads eagerly and has `fetchpriority="high"`. Fonts are preloaded. Those checks pass, but do not make the measured LCP budget pass. Follow-up work should examine the initial script/font dependency graph and deployed image delivery, then repeat measurements without changing the editorial design.

## Changes and loading rules

- Committed WOFF2 fonts replace browser TTF downloads. Inter Tight uses the regular 400 weight actually used by the interface, subset to Latin/Latin Extended, punctuation and currency; original sources/licences remain. The three fonts transfer 94,399 bytes in these runs. `next/font/local` supplies metric-adjusted fallback and preload links.
- Hero posters use responsive Next image optimization. Both possible mood posters remain discoverable before client time/preferences resolve, avoiding a wrong-mood blank frame. The two poster requests total 50,396 bytes on the measured mobile homepage.
- The decorative native player is a separate client chunk. Hero playback waits for page load plus 500ms; below-fold posters and product images mount near view. MP4 sources attach only to the selected visible player. Reduced motion, Motion Off and Save-Data retain posters without MP4 requests.
- The one visible hero MP4 accounts for 792,191 bytes of the homepage recording. The style guide requests no video or image media on its initial screen. This report includes the active decorative clip rather than hiding its cost.
- Quick-view and demo bodies load on demand inside immediate native modal shells. The shell traps focus, supports Close/Escape and reserves its viewport-bounded dimensions while content loads. Cancellation during chunk loading does not reopen the dialog.
- Framer Motion uses `LazyMotion`/`domAnimation`, omitting unused drag/layout features. GSAP and ScrollTrigger import only near the desktop Story when motion is allowed; mobile does not download the pinning chunk. All declared dependencies remain in use and direct versions remain pinned.

The browser suite also observed initial/adaptive CLS 0 at 375px and 1440px, and Story-scroll CLS 0 on desktop/mobile and under reduced motion. Reserved frames, growing text slots and fixed modal bounds are tested. These finite sessions cannot guarantee zero shifts on every device, stored profile or replacement asset.

## Reproduce

Build first; leave the test and audit server ports free. Lighthouse is temporary audit tooling, not an application dependency.

```sh
npm run build
npm start -- --port 3340
# In a second terminal; repeat three times with distinct report filenames.
CHROME_PATH=/usr/bin/chromium npx --yes lighthouse@13.5.0 \
  'http://127.0.0.1:3340/?hour=13' \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags='--headless --no-sandbox --disable-dev-shm-usage' \
  --output=json --output-path=/tmp/alter-home-lighthouse.json
# Repeat with /style-guide?hour=13. Do not run browser tests concurrently.
```

## Dependency and release checks

`npm audit` reports **9 affected packages: 7 high, 2 moderate, 0 critical**. This count includes dependency-chain reports; it is not nine independent underlying bugs. Two advisories affect build/lint tooling:

- [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): braces stack-exhaustion denial of service, propagated through micromatch/fast-glob/chokidar, Tailwind and the Next ESLint package chain.
- [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf): postcss-selector-parser CPU exhaustion, propagated through postcss-nested/Tailwind.

`npm audit --omit=dev` reports **0 vulnerabilities**. The full audit exits nonzero and remains a known release limitation. No `npm audit fix --force`, Tailwind major migration or suggested Next ESLint downgrade was applied; compatible remediation needs a separate review. Version pins and the lockfile are retained.

Lint, typecheck, 30 unit tests and 33 production browser tests pass. An additional production opt-in indexing smoke test passes; the final build is restored to default noindex. `.env*` and optimized images remain ignored, with only the nonsecret `.env.example` tracked. A current-tree scan found no private-key, GitHub-token or AWS-access-key patterns; this is a scoped check, not a comprehensive historical secret audit.

No deployed-host Lighthouse run, field LCP/INP/CLS, real mobile-device throttling, Safari/Firefox comparison or catastrophic root-error fault injection was available. No performance or usability outcome is inferred from fictional portfolio claims. See [ACCESSIBILITY.md](ACCESSIBILITY.md) for assistive-technology limitations.
