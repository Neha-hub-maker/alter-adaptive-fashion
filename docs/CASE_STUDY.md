# ALTER — Dress for the hour you're in.

## Overview

ALTER is a fictional unisex fashion and lifestyle brand built as a UX design portfolio project. The prototype explores how one editorial interface can respond to the local hour and a visitor's recent interests while keeping explicit controls and device-only data. Collection products, prices and brand claims are conceptual; there is no checkout or stock service.

## Role / Timeline / Tools

- Role: [OWNER: describe your role, responsibilities and any collaborators.]
- Timeline: [OWNER: describe the actual project dates, duration and stages.]
- Design and research tools: [OWNER: describe the tools you personally used and attach the original artefacts.]
- Implementation: Next.js App Router, TypeScript, Tailwind CSS, local fonts, Framer Motion, GSAP ScrollTrigger and Sharp. Validation uses Node tests, Playwright with Chromium, axe and Lighthouse.

## The problem

A static fashion homepage presents the same edit at every hour. This concept asks whether the edit can reflect a changing daily rhythm without hiding content or collecting a remote visitor profile. This is a design hypothesis, not a research finding. [OWNER: describe the actual brief, audience, research methods and evidence that motivated the project.]

## Goals

Make Day and Night legible, keep manual choices authoritative, explain recommendations in visible text, and let reviewers explore returning-visitor behaviour without altering their saved data. Preserve keyboard access, reduce unnecessary motion and keep the initial page stable. [OWNER: describe any agreed success criteria and which were validated with users.]

## Design principles

Minimal, editorial and urban styling uses a 12-column grid, generous spacing, restrained borders and Instrument Serif, Inter Tight and DM Mono. Ivory/Ink semantic tokens define the two moods; accessible accent-text variants keep the four accent choices readable. Adaptation changes emphasis and copy rather than hiding the main collection. A choice to turn personalization or motion off applies immediately.

## Key decisions and why

### Local time with a manual override

Auto selects Day from 06:00 to 17:59 and Night from 18:00 to 05:59. A before-paint bootstrap prevents an initial wrong mood; a minute clock checks boundaries. Saved Day or Night wins until Auto clears the override. The `?hour=0..23` parameter makes the hour logic reviewable without changing the machine clock.

### Private, on-device personalization

A sanitized, versioned local profile stores visit count, last-visit time, up to 12 recent product IDs and category/mood counts. A per-session flag avoids counting reloads as new visits. No tracking, accounts, analytics or profile network requests are implemented. Ranking gives the active mood the strongest weight, category affinity a medium weight, mood affinity a lighter weight, a small phase preference and a small penalty for views in the last two counted visits. Ties preserve source order, and each recommended card has a visible reason. Turning personalization off stops recording and hides adaptive UI; Clear my data removes the profile.

### A demo panel for reviewers

First visit, returning outerwear fan, late-night browser and morning minimalist presets run in memory. Shareable `?demo=` links reproduce them. A visible exit bar restores the real profile and settings; preset activity never writes over the saved profile. This is a review aid, not evidence of a validated user need.

### Motion as a visitor choice

Shared 200/400/800ms duration tokens, one easing curve and an 80ms stagger constrain UI motion to opacity and transforms. Framer Motion handles reveals and light parallax. GSAP is imported only near the desktop Story, where its media pinning has a clear purpose. System reduced motion always wins; the visible Motion toggle can reduce motion further. A short dusk layer bridges mood changes after initial load and has a bounded poster/crossfade fallback.

### Stock imagery without misleading branding

Three registry images contain third-party branding and are excluded from fictional collection products. The social preview uses the unbranded editorial-bw-suit photo. `/credits` records the supplied image handles and Pexels video IDs, including poster stills. Missing video creators are explicitly marked for owner completion. Stock imagery illustrates the concept rather than documenting manufactured ALTER products.

### Accessibility during loading and adaptation

Heading order, semantic lists, labelled native controls and native modal dialogs provide a stable reading structure. Quick-view and demo payloads are deferred while their dialog shell opens immediately, preserving Escape and focus containment during loading. Story text stays in DOM order while the background is pinned. Returning copy and the clock do not announce themselves continuously. Recommendations and states have textual explanations.

## Accessibility

The release audit covers seven requested states in all eight mood/accent palettes, keyboard dialog behaviour, reflow, enlarged text, spacing overrides, reduced motion and touch targets. Fixes include larger controls, a wrapping header and unclipped card text. [ACCESSIBILITY.md](ACCESSIBILITY.md) records the methods, measured contrast and remaining limitations. Automated checks do not replace screen-reader testing, and this project makes no claim of full WCAG conformance.

## Performance

Hero posters receive high fetch priority; fonts are self-hosted and preloaded with metric-adjusted fallback. The body font uses its regular 400 weight in a Latin/Latin Extended WOFF2 subset while original font sources and licences are retained. Decorative product images and nonpriority posters wait until near view. Hero playback waits until the first assets load; offscreen playback pauses and the coordinator favours one video. Modal content and desktop pinning load only when needed. [PERFORMANCE.md](PERFORMANCE.md) contains the actual production Lighthouse runs and budget comparison. Median mobile LCP is 3.45s on Home and 2.56s on the style guide, above the 2.5s budget; both have CLS 0 in these lab runs.

## What I measured

Code checks cover profile recovery, deterministic ranking, preference persistence, demo isolation, asset credits, metadata, noindex defaults and the indexing opt-in. Browser checks cover palette/state accessibility, layout stability, focus behaviour, lazy requests and motion settings. Lighthouse measures mobile simulated-load performance rather than real visitor outcomes. [OWNER: describe any usability sessions, participant recruitment, tasks, findings, feedback and measured outcomes; add only evidence that actually exists.]

## Limitations

The products, pricing, bag and brand narrative are fictional. There is no checkout, account, live stock or validated fit guidance. Attribution still needs seven video creator names. No screen-reader sessions, Safari/iOS tests or field Web Vitals were available. The dependency audit includes unresolved build/lint advisories; production-only audit results are separate. Local storage can be denied or cleared, and in-memory fallback lasts only for the page lifetime. Recommendations are a small deterministic heuristic, not a validated learning model.

## What I would do next

Complete attribution and owner-specific portfolio evidence, run screen-reader and mobile-device sessions, validate the recommendation explanations and reset controls with actual participants, and collect performance evidence on the deployed host. Review the build-tool advisories when compatible fixes are available. Future commerce or remote data would require a separate scope and privacy design. [OWNER: describe your own priorities and any follow-up work already completed.]
