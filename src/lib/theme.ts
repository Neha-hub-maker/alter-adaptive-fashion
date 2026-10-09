export const themes = ["day", "night"] as const;
export const accents = ["petrol", "magenta", "camel", "gold"] as const;
export type Theme = (typeof themes)[number];
export type Accent = (typeof accents)[number];

// Run before paint. System preference is consulted only when no choice is saved.
// Storage can be unavailable (private contexts); controls still work in memory.
export const themeBootstrap = `(() => {
  const root = document.documentElement;
  let theme = 'day';
  let accent = 'petrol';
  try {
    const savedTheme = localStorage.getItem('alter-theme');
    const savedAccent = localStorage.getItem('alter-accent');
    theme = ['day', 'night'].includes(savedTheme) ? savedTheme :
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day');
    if (['petrol', 'magenta', 'camel', 'gold'].includes(savedAccent)) accent = savedAccent;
  } catch {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
  }
  root.dataset.theme = theme;
  root.dataset.accent = accent;
})();`;
