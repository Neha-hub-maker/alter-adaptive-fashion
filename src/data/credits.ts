import type { ImageFile } from "./images";

export interface ImageCredit { file: ImageFile; creator: string }
export const imageCredits: readonly ImageCredit[] = [
  { file: "model-dark-mirror.jpg", creator: "buusecolak" },
  { file: "model-minimal-meshbag.jpg", creator: "cottonbro" },
  { file: "editorial-leather-shadow.jpg", creator: "cottonbro" },
  { file: "street-night-allwhite.jpg", creator: "eddson-lens" },
  { file: "day-blazer-yucca.jpg", creator: "conejodepapel" },
  { file: "street-paris-leather.jpg", creator: "david-kouakou" },
  { file: "street-navy-coat-magenta.jpg", creator: "evgeniygorman" },
  { file: "editorial-bw-suit.jpg", creator: "vitalyagorbachev" },
  { file: "flatlay-ribbed-top-denim.jpg", creator: "elena_-sher" },
  { file: "flatlay-jewelry-chiffon.jpg", creator: "ezzagraphics09" },
  { file: "product-teal-sneakers.jpg", creator: "jose-martin-segura-benites" },
  { file: "texture-teal-fabric.jpg", creator: "karola-g" },
  { file: "store-cream-blazer-rack.jpg", creator: "tkirkgoz" },
  { file: "texture-crimson-linen.jpg", creator: "3d-render" },
  { file: "bg-gradient-pastel.jpg", creator: "codioful" },
  { file: "texture-plaster-sand.jpg", creator: "plato-terentev" },
];
export interface VideoCredit { file: string; poster: string; pexelsId: number; creator: "to be added by the site owner" }
export const videoCredits: readonly VideoCredit[] = [
  ["boutique-hands-sweaters", 5743177], ["texture-blue-silk-loop", 7677240], ["boutique-browsing-portrait", 7680438],
  ["hero-day-street-walk", 7681897], ["behind-the-scenes-shoot", 7779054], ["hero-day-street-walk-portrait", 8027610], ["mood-dusk-silhouette", 14180913],
].map(([name, id]) => ({ file: `/video/${name}.mp4`, poster: `/video/${name}-poster.jpg`, pexelsId: Number(id), creator: "to be added by the site owner" }));
