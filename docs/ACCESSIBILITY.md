# Accessibility audit

This is a fictional portfolio prototype, not a claim of full WCAG conformance. Automated checks do not replace screen-reader testing. The audit combines axe, keyboard/browser regression tests and a review of the implemented semantics; it does not establish how every assistive technology will announce the interface.

## Scope and method

Production Chromium was tested on 10 October 2026. The release matrix runs axe-core against WCAG 2 A/AA, 2.1 AA and 2.2 AA rule tags in both Day and Night with Petrol, Magenta, Camel and Gold. Each of the eight palettes covers the homepage, style guide, open mobile menu, quick view with a required-size error, open demo panel, active returning-visitor demo and empty filter state: 56 state/palette checks. Credits is also checked. The separate existing suite covers desktop/mobile dialogs, all four demo presets, storage denial, reduced motion and Motion Off.

The browser review checks one h1 per page and consecutive heading levels on /, /style-guide and /credits; header/main/footer landmarks; labelled navigation; the first-focusable skip link and its main target; keyboard dialog containment, Escape and focus restoration; required size and colour labels; visible recommendation reasons; 320px reflow, 200% text sizing, an effective 200% viewport, and WCAG text-spacing overrides (1.5 line height, .12em letter spacing, .16em word spacing, 2em paragraph spacing). Mobile links, buttons and radio labels have at least 44×44 CSS-pixel targets. Native dialogs can scroll independently when content is enlarged. Focus styling is reviewed in CSS and exercised on radios, filters, cards and dialogs in the browser suite.

## Fixes

- Mood/accent, filter, size, bag, menu, demo and footer controls now have minimum 44px targets. Mobile wordmark and footer/hero links have sufficient height and width.
- Saved manual mood selection uses the before-paint root attributes for its visual state; the Auto status suffix is hidden in manual mode before hydration. The collection edit label also follows those attributes before client state arrives.
- The sticky header uses a minimum height and wraps rather than overflowing when spacing or text size increases.
- Product buttons now describe their price and edit to assistive technology, alongside visible recommendation reasons; the action name no longer masks that metadata.
- Recommended/recent card text can grow instead of being cut off by a fixed height and a two-line clamp. Normal card geometry remains reserved before hydration.
- Dialog focus returns to a visible trigger, scrolling a moved card into view; if the mobile menu trigger disappears at the desktop breakpoint, focus returns to the header wordmark.
- Quick-view and demo content load on demand inside an immediate native dialog shell. Close, focus containment and Escape work even while the quick-view chunk is deliberately delayed; cancellation does not reopen it later. Viewport-bounded dialog dimensions keep Close in place while deferred content arrives; enlarged content scrolls within the panel.
- The Bag control now reaches the homepage collection from secondary pages instead of silently doing nothing.
- Selected controls receive a system-colour outline in forced-colours mode. This code path was reviewed, not validated on Windows High Contrast.
- Custom 404 and error views provide meaningful headings and recovery controls. Error headings receive focus; raw error details are not printed to visitors.

## Contrast and motion

All eight palette combinations pass the tested axe contrast checks. The existing browser calculation measures normal accent text on the theme background as Day: Petrol 6.82:1, Magenta 7.56:1, Camel 6.84:1, Gold 5.94:1; Night: 9.16:1, 8.34:1, 5.14:1, 8.04:1 respectively. Use the semantic accent-text variants, not raw brand swatches, for body-size text.

The conservative hero measurements are documented in [hero-contrast.md](hero-contrast.md): at least 13.67:1 across sampled Day posters/frames and 11.04:1 across sampled Night posters/frames; the mathematical worst-case white Night frame with the minimum overlay still gives 6.97:1. These assess the specified foreground and minimum overlay, not every possible future asset or frame. Recheck if those assets or gradients change.

The clock and returning-visitor line are not live regions. Filter counts, bag additions and data-clearing feedback use scoped status messages; size errors have an alert and a described focus target. System reduced motion and the visible Motion Off setting expose final states, show posters, disable parallax/pinning and skip dusk. Story copy remains present in DOM order during pinning; scroll speed and direction remain native.

## Known limitations and follow-up

No NVDA, JAWS, VoiceOver or TalkBack session was available. Actual announcement order, native-dialog behaviour across screen readers, duplicate validation announcements and touch exploration need owner testing. 200% testing used effective viewport reduction and CSS text enlargement; browser-toolbar zoom itself was not manually operated. Safari/iOS, Firefox, forced colours on Windows and switch-control navigation were not tested. The three state-heavy overlays were tested in Chromium; catastrophic root error/retry paths were compiled and reviewed but not fault-injected. There is no research evidence that the fictional sizing or recommendation explanations are understandable to real shoppers.

Before publication, the owner should perform screen-reader and device sessions, review the keyboard journey with all motion disabled, and check any replacement photography against its actual text overlay. No automated score should be represented as full WCAG compliance.
