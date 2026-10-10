import type { ImageFile } from "./images";
import type { Theme } from "../lib/theme";

export const productCategories = ["outerwear", "suiting", "trousers", "sets", "accessories"] as const;
export const productColorTokens = ["ink", "charcoal", "fog", "ivory", "cream", "petrol", "magenta", "camel", "gold"] as const;
export type ProductCategory = (typeof productCategories)[number];
export type ProductColorToken = (typeof productColorTokens)[number];
export interface ProductColor { name: string; token: ProductColorToken }
export interface Product {
  id: string;
  name: string;
  /** Fictional retail price in USD. */
  price: number;
  category: ProductCategory;
  mood: Theme;
  imageFile: ImageFile;
  description: string;
  details: readonly [string, string, string];
  sizes: readonly string[];
  colors: readonly ProductColor[];
}

// Concept garments: stock photographs are editorial references, not SKU images.
export const products: readonly Product[] = [
  {
    id: "nocturne-leather-jacket", name: "Nocturne Leather Jacket", price: 420, category: "outerwear", mood: "night", imageFile: "editorial-leather-shadow.jpg",
    description: "Supple leather with a boxy cut and room through the shoulders. Wear it open over a daytime knit, then zip it over a lean evening layer.",
    details: ["Supple leather shell", "Relaxed, hip-length fit", "Two zipped welt pockets"], sizes: ["XS", "S", "M", "L", "XL"], colors: [{ name: "Ink", token: "ink" }],
  },
  {
    id: "rue-leather-overshirt", name: "Rue Leather Overshirt", price: 395, category: "outerwear", mood: "night", imageFile: "street-paris-leather.jpg",
    description: "A soft leather overshirt with a straight hem and an easy, unisex fit. Layer it over a tee for the commute or button it up with tailored trousers after dark.",
    details: ["Soft leather with a matte finish", "Straight, generous silhouette", "Snap front and adjustable cuffs"], sizes: ["XS", "S", "M", "L", "XL"], colors: [{ name: "Ink", token: "ink" }, { name: "Camel", token: "camel" }],
  },
  {
    id: "hush-longline-coat", name: "Hush Longline Coat", price: 310, category: "outerwear", mood: "night", imageFile: "model-dark-mirror.jpg",
    description: "A brushed wool-blend coat cut long, with a clean shoulder and a soft lining. Its quiet shape sits comfortably over suiting by day and a fine-gauge knit by night.",
    details: ["Brushed wool-blend cloth", "Longline, relaxed fit", "Concealed fastening and back vent"], sizes: ["XS", "S", "M", "L", "XL"], colors: [{ name: "Charcoal", token: "charcoal" }],
  },
  {
    id: "meridian-overcoat", name: "Meridian Overcoat", price: 360, category: "outerwear", mood: "day", imageFile: "street-navy-coat-magenta.jpg",
    description: "Dense wool twill, a roomy sleeve and a softly structured lapel make this a coat for moving through the city. A vivid lining adds a glimpse of colour from the first coffee to the last train.",
    details: ["Wool twill with a magenta lining", "Relaxed knee-length silhouette", "Deep pockets and a rear walking vent"], sizes: ["XS", "S", "M", "L", "XL"], colors: [{ name: "Deep petrol", token: "petrol" }, { name: "Charcoal", token: "charcoal" }],
  },
  {
    id: "studio-blazer", name: "Studio Blazer", price: 240, category: "suiting", mood: "night", imageFile: "editorial-bw-suit.jpg",
    description: "Fluid wool-viscose tailoring with a lightly shaped waist and an unpadded shoulder. Pair it with denim during studio hours, then matching dark trousers for the evening.",
    details: ["Wool-viscose suiting cloth", "Unpadded shoulder, easy waist", "Single-breasted two-button front"], sizes: ["XS", "S", "M", "L", "XL"], colors: [{ name: "Charcoal", token: "charcoal" }, { name: "Ivory", token: "ivory" }],
  },
  {
    id: "daylight-check-blazer", name: "Daylight Check Blazer", price: 210, category: "suiting", mood: "day", imageFile: "day-blazer-yucca.jpg",
    description: "A fine-check cotton-linen blazer with a loose shoulder and breathable half lining. Its easy drape works over a white tee in daylight or a silk layer at dinner.",
    details: ["Fine-check cotton-linen weave", "Relaxed fit with half lining", "Patch pockets and a single back vent"], sizes: ["XS", "S", "M", "L", "XL"], colors: [{ name: "Fog check", token: "fog" }],
  },
  {
    id: "column-trouser", name: "Column Trouser", price: 128, category: "trousers", mood: "day", imageFile: "model-minimal-meshbag.jpg",
    description: "Crisp cotton twill with a straight leg, a cropped hem and a discreet elastic panel at the waist. Move from trainers on the morning walk to a polished flat after work.",
    details: ["Midweight cotton twill", "Straight leg with an ankle-length hem", "Flat front and elastic back waist"], sizes: ["XS", "S", "M", "L", "XL"], colors: [{ name: "Ink", token: "ink" }, { name: "Cream", token: "cream" }],
  },
  {
    id: "midnight-ivory-set", name: "Midnight Ivory Set", price: 190, category: "sets", mood: "night", imageFile: "street-night-allwhite.jpg",
    description: "An airy cotton jersey top and wide-leg cotton trousers in a single ivory tone. Wear the pieces separately through the day, or together for an understated late-night silhouette.",
    details: ["Cotton jersey top and woven trousers", "Loose tee and wide-leg fit", "Drawcord waist with side pockets"], sizes: ["XS", "S", "M", "L", "XL"], colors: [{ name: "Ivory", token: "ivory" }],
  },
  {
    id: "pearl-gold-jewellery-edit", name: "Pearl & Gold Jewellery Edit", price: 64, category: "accessories", mood: "day", imageFile: "flatlay-jewelry-chiffon.jpg",
    description: "A small edit of freshwater pearls and gold-tone brass, designed for light, easy layering. A single piece catches the morning light; stack the set against dark tailoring after dusk.",
    details: ["Freshwater pearl and gold-tone brass", "Lightweight necklace and earring edit", "Adjustable necklace clasp"], sizes: ["One size"], colors: [{ name: "Gold", token: "gold" }],
  },
];

export interface ProductFilters { mood?: Theme; category?: ProductCategory }
export function filterProducts({ mood, category }: ProductFilters = {}): Product[] {
  return products.filter((product) => (!mood || product.mood === mood) && (!category || product.category === category));
}

export function sortForTheme(pieces: readonly Product[], theme: Theme): Product[] {
  // Stable partition: keep the caller's order within each edit; never mutate it.
  return [...pieces.filter((product) => product.mood === theme), ...pieces.filter((product) => product.mood !== theme)];
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export function formatPrice(price: number): string { return usd.format(price); }
