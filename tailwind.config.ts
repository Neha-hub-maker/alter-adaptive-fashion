import type { Config } from "tailwindcss";

const color = (token: string) => `rgb(var(--${token}-rgb) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      ...Object.fromEntries(
        ["ink", "charcoal", "fog", "ivory", "cream", "petrol", "magenta", "camel", "gold",
          "bg", "surface", "text", "muted", "accent", "border", "accent-text", "on-accent"]
          .map((name) => [name, color(name)]),
      ),
    },
    spacing: {
      0: "0", px: "1px", 1: "8px", 2: "16px", 3: "24px", 4: "32px",
      5: "40px", 6: "48px", 7: "56px", 8: "64px", 10: "80px", 12: "96px",
      16: "128px", 20: "160px", 24: "192px",
    },
    borderRadius: { none: "0", sm: "2px" },
    fontFamily: {
      display: ["var(--font-display)", "Georgia", "serif"],
      body: ["var(--font-body)", "Arial", "sans-serif"],
      label: ["var(--font-label)", "monospace"],
    },
    fontSize: {
      h1: ["var(--type-h1)", { lineHeight: "0.98", letterSpacing: "-0.035em" }],
      h2: ["var(--type-h2)", { lineHeight: "1.08", letterSpacing: "-0.025em" }],
      h3: ["var(--type-h3)", { lineHeight: "1.12" }],
      h4: ["var(--type-h4)", { lineHeight: "1.2" }],
      body: ["var(--type-body)", { lineHeight: "1.6" }],
      small: ["var(--type-small)", { lineHeight: "1.5" }],
      label: ["var(--type-label)", { lineHeight: "1.5", letterSpacing: "0.12em" }],
    },
    extend: { maxWidth: { canvas: "1440px" } },
  },
  plugins: [],
} satisfies Config;
