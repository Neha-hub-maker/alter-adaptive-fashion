export const imageCategories = ["model", "editorial", "street", "flatlay", "product", "store", "texture"] as const;
export type ImageCategory = (typeof imageCategories)[number];
export type ImageMood = "day" | "night";
export type ImageFile = `${string}.jpg`;

export interface ImageMetadata {
  /** Original basename in /public/images/raw/. */
  file: ImageFile;
  category: ImageCategory;
  mood: ImageMood;
  alt: string;
  thirdPartyBranding: boolean;
}

export const images: readonly ImageMetadata[] = [
  { file: "model-dark-mirror.jpg", category: "model", mood: "night", alt: "Cropped mirror portrait of a person in a black jacket and dark pleated skirt, holding a silver phone.", thirdPartyBranding: false },
  { file: "model-minimal-meshbag.jpg", category: "model", mood: "day", alt: "Person in a white top, cropped black trousers and white sneakers carrying a cream mesh bag filled with greenery.", thirdPartyBranding: false },
  { file: "editorial-leather-shadow.jpg", category: "editorial", mood: "night", alt: "Model in a black leather jacket, pleated skirt and ankle boots beside a large shadow on a pale studio wall.", thirdPartyBranding: false },
  { file: "editorial-bw-suit.jpg", category: "editorial", mood: "night", alt: "Black-and-white studio portrait of a model in a dark tailored suit, standing with one leg bent.", thirdPartyBranding: false },
  { file: "street-night-allwhite.jpg", category: "street", mood: "night", alt: "Person wearing a white cap, white T-shirt and wide white trousers on a city street at night.", thirdPartyBranding: false },
  { file: "street-paris-leather.jpg", category: "street", mood: "night", alt: "Person in sunglasses and a black leather jacket at a Paris street crossing in daylight.", thirdPartyBranding: false },
  { file: "street-navy-coat-magenta.jpg", category: "street", mood: "day", alt: "Person in sunglasses, a navy coat and trousers over a magenta top walking along a stone-lined city street.", thirdPartyBranding: false },
  { file: "day-blazer-yucca.jpg", category: "street", mood: "day", alt: "Person in a gray blazer, blue jeans and white sneakers sitting on a low wall beside yucca plants.", thirdPartyBranding: false },
  { file: "flatlay-jewelry-chiffon.jpg", category: "flatlay", mood: "day", alt: "Gold- and silver-toned earrings, bracelets and necklaces arranged on softly folded ivory chiffon.", thirdPartyBranding: false },
  { file: "flatlay-ribbed-top-denim.jpg", category: "flatlay", mood: "day", alt: "Cream printed top layered over folded blue denim, with a flower accessory and skincare containers on a gray surface.", thirdPartyBranding: true },
  { file: "product-teal-sneakers.jpg", category: "product", mood: "day", alt: "Pair of mint-teal low-top sneakers with cream soles and pale laces against a light gray background.", thirdPartyBranding: true },
  { file: "store-cream-blazer-rack.jpg", category: "store", mood: "day", alt: "Cream tailored blazers hanging on a dark metal clothing rack inside a warmly lit boutique.", thirdPartyBranding: true },
  { file: "texture-teal-fabric.jpg", category: "texture", mood: "night", alt: "Close-up of deep teal woven fabric gathered into soft folds.", thirdPartyBranding: false },
  { file: "texture-crimson-linen.jpg", category: "texture", mood: "night", alt: "Close-up of crimson linen with a visible weave and shallow folds.", thirdPartyBranding: false },
  { file: "texture-plaster-sand.jpg", category: "texture", mood: "day", alt: "Mottled sand-colored plaster with pale patches and a rough, weathered texture.", thirdPartyBranding: false },
  { file: "bg-gradient-pastel.jpg", category: "texture", mood: "day", alt: "Soft pastel gradient blending mint, lavender, pink and warm peach.", thirdPartyBranding: false },
];

export interface ImageFilters {
  category?: ImageCategory;
  mood?: ImageMood;
  excludeBranded?: boolean;
}

export function getImages({ category, mood, excludeBranded = false }: ImageFilters = {}): ImageMetadata[] {
  return images.filter((image) =>
    (!category || image.category === category) &&
    (!mood || image.mood === mood) &&
    (!excludeBranded || !image.thirdPartyBranding),
  );
}

export type ImageWidth = 800 | 1400 | 2200;
export function optimizedImagePath(file: ImageFile, width: ImageWidth): string {
  return `/images/optimized/${file.replace(/\.jpg$/, "")}-${width}.webp`;
}
