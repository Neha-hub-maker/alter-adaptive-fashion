# Hero contrast audit

Run `node scripts/check-hero-contrast.mjs` from the repo root (requires ffmpeg).
The script decodes full-resolution RGB pixels from each poster and MP4 frames at
1, 4 and 8 seconds. It composites every pixel with the **minimum** overlay opacity
in the protected text area, then uses WCAG's sRGB relative-luminance formula to
find the lowest normal-text contrast. This is a conservative lower bound: the
actual gradients are more opaque over much of the copy. It is not an average.

Day uses Ink `#0E0E10` over an Ivory `#F4F1EA` wash at a minimum 0.90 opacity.
The wash fades away outside the copy area: after 66% of the desktop hero width,
or within the outer 48px at the top/bottom on mobile. Copy stays inside the
protected plateau (64px vertical padding and the existing desktop 63% width cap).
Night uses Ivory over the existing Ink gradient at a minimum 0.72 opacity.
The right-side Night photograph stays outside the copy area.

| Asset | Poster | 1s | 4s | 8s |
| --- | ---: | ---: | ---: | ---: |
| Day landscape street walk | 13.70:1 | 13.69:1 | 13.67:1 | 13.67:1 |
| Day portrait street walk | 13.73:1 | 13.71:1 | 13.73:1 | 13.81:1 |
| Night blue silk | 11.34:1 | 11.61:1 | 11.04:1 | 11.36:1 |

All sampled minima exceed WCAG AA's 4.5:1 normal-text requirement. Even an
entirely black Day frame or entirely white Night frame remains above AA with
these minimum opacities (13.67:1 and 6.97:1 respectively). The button uses solid
Ink/Ivory semantic tokens rather than relying on footage for its contrast.

Sampling cannot exhaust every moving frame, but the worst-case opacity bounds
protect the text independently of the footage. Browser checks verify the Day
foreground, responsive copy bounds, and both themes with axe. Anti-aliased text
edge pixels are not treated as the nominal foreground in WCAG calculations.
