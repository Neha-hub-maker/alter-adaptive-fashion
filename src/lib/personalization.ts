import type { Product, ProductCategory } from "../data/products";
import type { VisitorProfile } from "./profile-model";
import { getPhaseLabel, type Theme } from "./theme.ts";

export interface RecommendationContext { profile?: VisitorProfile | null; theme: Theme; hour: number }
export interface Recommendation { product: Product; score: number; reason: string }
function hourCategory(hour: number): ProductCategory {
  return ({ Morning: "trousers", Afternoon: "suiting", Evening: "outerwear", Late: "sets" } as const)[getPhaseLabel(hour)];
}
export function scoreProduct(product: Product, { profile, theme, hour }: RecommendationContext): number {
  const maxCategory = Math.max(1, ...Object.values(profile?.categoryViews ?? {}));
  const maxMood = Math.max(1, ...Object.values(profile?.moodViews ?? {}));
  const lastViewed = profile?.viewedAtVisit[product.id];
  const recent = lastViewed !== undefined && profile && lastViewed >= profile.visitCount - 1 && lastViewed <= profile.visitCount;
  return (product.mood === theme ? 100 : 0) + 30 * ((profile?.categoryViews[product.category] ?? 0) / maxCategory) + 10 * ((profile?.moodViews[product.mood] ?? 0) / maxMood) + (product.category === hourCategory(hour) ? 5 : 0) - (recent ? 8 : 0);
}
export function recommendProducts(products: readonly Product[], context: RecommendationContext, limit: number): Recommendation[] {
  const personal = !!context.profile && Object.values(context.profile.categoryViews).some((count) => count > 0);
  const maxCategory = Math.max(1, ...Object.values(context.profile?.categoryViews ?? {}));
  return products.map((product, index) => {
    const affinity = context.profile?.categoryViews[product.category] ?? 0;
    const reason = personal && affinity === maxCategory ? `Because you viewed ${product.category}` : product.mood === context.theme ? `Matches your ${context.theme === "day" ? "Day" : "Night"} edit` : "Popular for this hour";
    return { product, score: scoreProduct(product, context), reason, index };
  }).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, Math.max(0, Number.isFinite(limit) ? Math.floor(limit) : 0)).map(({ product, score, reason }) => ({ product, score, reason }));
}
