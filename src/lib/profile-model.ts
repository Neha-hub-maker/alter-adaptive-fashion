import { products, type Product, type ProductCategory } from "../data/products.ts";
import type { Theme } from "./theme";

export interface VisitorProfile {
  version: 1;
  visitCount: number;
  /** Empty only for the neutral, never-visited state. Otherwise canonical ISO UTC. */
  lastVisitAt: string;
  recentlyViewed: string[];
  categoryViews: Partial<Record<ProductCategory, number>>;
  moodViews: Partial<Record<Theme, number>>;
  /** Bounded by recentlyViewed; used to expire the two-visit freshness penalty. */
  viewedAtVisit: Record<string, number>;
}
export function clearProfile(): VisitorProfile {
  return { version: 1, visitCount: 0, lastVisitAt: "", recentlyViewed: [], categoryViews: {}, moodViews: {}, viewedAtVisit: {} };
}
export function sanitizeProfile(value: unknown, catalog: readonly Product[] = products): VisitorProfile {
  const empty: VisitorProfile = { version: 1, visitCount: 0, lastVisitAt: "", recentlyViewed: [], categoryViews: {}, moodViews: {}, viewedAtVisit: {} };
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty;
  const source = value as Record<string, unknown>;
  const object = (item: unknown): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item);
  const count = (item: unknown) => typeof item === "number" && Number.isSafeInteger(item) && item >= 0 ? Math.min(item, 1_000_000) : 0;
  if (source.version !== 1 || typeof source.visitCount !== "number" || !Number.isSafeInteger(source.visitCount) || source.visitCount < 0 || !Array.isArray(source.recentlyViewed) || !object(source.categoryViews) || !object(source.moodViews)) return empty;
  if (typeof source.lastVisitAt !== "string" || (source.visitCount > 0 && (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(source.lastVisitAt) || !Number.isFinite(Date.parse(source.lastVisitAt)) || new Date(`${source.lastVisitAt.slice(0, 10)}T00:00:00.000Z`).toISOString().slice(0, 10) !== source.lastVisitAt.slice(0, 10)))) return empty;
  const ids = new Set(catalog.map((product) => product.id));
  const recentlyViewed = [...new Set(source.recentlyViewed.filter((id): id is string => typeof id === "string" && ids.has(id)))].slice(0, 12);
  const categoryViews: VisitorProfile["categoryViews"] = {};
  for (const category of new Set(catalog.map((product) => product.category))) categoryViews[category] = count(source.categoryViews[category]);
  const moodViews = { day: count(source.moodViews.day), night: count(source.moodViews.night) };
  const visitCount = count(source.visitCount);
  const viewedAtVisit: Record<string, number> = {};
  for (const id of recentlyViewed) {
    const visit = object(source.viewedAtVisit) ? source.viewedAtVisit[id] : undefined;
    if (typeof visit === "number" && Number.isSafeInteger(visit) && visit >= 0 && visit <= visitCount) viewedAtVisit[id] = visit;
  }
  return { version: 1, visitCount, lastVisitAt: visitCount ? new Date(source.lastVisitAt).toISOString() : "", recentlyViewed, categoryViews, moodViews, viewedAtVisit };
}
export function recordVisit(profile: VisitorProfile, now: string, alreadyCounted = false): VisitorProfile {
  if (alreadyCounted) return profile;
  if (!Number.isFinite(Date.parse(now))) throw new RangeError("A visit requires a valid ISO date.");
  const visitCount = Math.min(profile.visitCount + 1, 1_000_000);
  const viewedAtVisit = Object.fromEntries(Object.entries(profile.viewedAtVisit).filter(([, visit]) => visit >= visitCount - 1));
  return { ...profile, visitCount, lastVisitAt: new Date(now).toISOString(), viewedAtVisit };
}
export function recordView(profile: VisitorProfile, product: Product): VisitorProfile {
  const recentlyViewed = [product.id, ...profile.recentlyViewed.filter((id) => id !== product.id)].slice(0, 12);
  const viewedAtVisit = Object.fromEntries(Object.entries({ ...profile.viewedAtVisit, [product.id]: profile.visitCount }).filter(([id]) => recentlyViewed.includes(id)));
  return { ...profile, recentlyViewed, viewedAtVisit, categoryViews: { ...profile.categoryViews, [product.category]: Math.min((profile.categoryViews[product.category] ?? 0) + 1, 1_000_000) }, moodViews: { ...profile.moodViews, [product.mood]: Math.min((profile.moodViews[product.mood] ?? 0) + 1, 1_000_000) } };
}

// Reserve the recent strip before paint without putting private text into HTML.
// The hook still starts from the neutral server snapshot and fills it after mount.
function bootstrap(sanitize: typeof sanitizeProfile, catalog: readonly Product[]) {
  const preset = document.documentElement.dataset.adaptiveDemo;
  if (preset) { document.documentElement.dataset.hasRecent = preset === "first" ? "false" : "true"; return; }
  let profile: VisitorProfile | undefined;
  try { profile = sanitize(JSON.parse(localStorage.getItem("alter-profile") ?? "null"), catalog); } catch { /* Missing/corrupt/denied data has no strip. */ }
  document.documentElement.dataset.hasRecent = profile?.recentlyViewed.length ? "true" : "false";
}
export const profileBootstrap = `(${bootstrap.toString()})(${sanitizeProfile.toString()},${JSON.stringify(products.map(({ id, category }) => ({ id, category })))});`;
