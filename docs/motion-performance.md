# Motion performance check

Comparison against merged Collection commit `3428900`, using production builds
with the same Next.js version, Turbopack, dependencies and assets. Five loads per
variant alternated in fresh Chromium contexts, at 1440 × 1000 with motion enabled,
no network/CPU throttling and `?hour=9`. Measurements used PerformanceObserver and
Resource Timing after 1.3 seconds of visible playback. Browser caches were cold;
local server caches warmed after the first run.

| Metric | Before motion | Motion build |
| --- | ---: | ---: |
| Median FCP | 188ms | 224ms |
| Median LCP | 188ms | 224ms |
| Initial encoded JavaScript (rounded) | 141 KiB | 188 KiB |
| Initial maximum CLS | 0.0000523 | 0.0000523 |

The motion layer adds about 47 KiB of initial JavaScript and 36ms to the median
local paint times in this sample. GSAP/ScrollTrigger is dynamically imported only
near Story; below-fold clips defer video sources until selected while visible.
Neither the dusk clip nor the pinned sequence gates the initial render.

The browser suite also records CLS while scrolling the Story and creating the
desktop pin: **0.0000523 desktop**, **0.0001899 mobile**, and **0.0000523 desktop
with reduced motion**. All are below 0.0002; the initial desktop shift is unchanged
from the merged baseline. Entrances animate reserved elements with transform and
opacity, not dimensions or document flow.

These are local lab checks, not field metrics or a claim about slow networks or
physical devices. Safari/iOS, device GPU behavior, throttled mobile performance,
and production CDN/Vercel timings were not verified here.
