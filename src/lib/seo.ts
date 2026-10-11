import type { Metadata, MetadataRoute } from "next";

export const siteDescription = "Dress for the hour you're in. ALTER is a fictional, unisex adaptive fashion concept exploring time-aware design and private, on-device recommendations for a UX portfolio.";

export function getSiteUrl(publicUrl = process.env.NEXT_PUBLIC_SITE_URL, vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL): URL {
  const value = publicUrl || (vercelHost ? `https://${vercelHost}` : "https://alter.example");
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Site URL must be an HTTP(S) URL without credentials.");
  return new URL(url.origin);
}
export function indexingAllowed(value = process.env.NEXT_PUBLIC_ALLOW_INDEXING): boolean { return value === "true"; }
export function robotsPolicy(allow = indexingAllowed()): Metadata["robots"] { return { index: allow, follow: allow }; }
export function crawlerRules(allow = indexingAllowed(), base = getSiteUrl()): MetadataRoute.Robots {
  return allow ? { rules: { userAgent: "*", allow: "/", disallow: "/style-guide" }, sitemap: new URL("/sitemap.xml", base).href } : { rules: { userAgent: "*", disallow: "/" } };
}
export function sitemapEntries(allow = indexingAllowed(), base = getSiteUrl()): MetadataRoute.Sitemap {
  return allow ? ["/", "/credits"].map((path) => ({ url: new URL(path, base).href })) : [];
}
export function pageMetadata(title: string, path: string, description = siteDescription): Metadata {
  return { title, description, alternates: { canonical: path }, openGraph: { title: `${title} | ALTER`, description, url: path, siteName: "ALTER", type: "website", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "ALTER — Dress for the hour you're in." }] }, twitter: { card: "summary_large_image", title: `${title} | ALTER`, description, images: ["/opengraph-image"] } };
}
