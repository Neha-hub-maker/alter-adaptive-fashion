"use client";

import { useLayoutEffect, useRef } from "react";
import { products, type Product } from "@/data/products";
import { ProductCard, focusProductInGrid } from "@/components/product-card";
import { recommendProducts } from "@/lib/personalization";
import { clearRecentlyViewed, useProfile } from "@/lib/profile";
import { useTheme } from "@/lib/use-theme";

type OpenProduct = (product: Product, trigger: HTMLElement) => void;
export function HourPicks({ onOpen }: { onOpen: OpenProduct }) {
  const { profile, enabled, ready } = useProfile();
  const { theme, hour } = useTheme();
  const picks = recommendProducts(products, { profile: enabled ? profile : null, theme, hour: hour ?? 9 }, 4);
  const focused = useRef<HTMLElement | null>(null);
  const order = picks.map(({ product }) => product.id).join("|");
  useLayoutEffect(() => {
    const previous = focused.current;
    if (previous && !previous.isConnected && document.activeElement === document.body) { focusProductInGrid(previous.dataset.productId!); focused.current = null; }
  }, [order]);
  return <section aria-labelledby="hour-picks-title" className="hour-picks adaptive-slot" data-ready={ready && hour !== undefined}>
    <h3 id="hour-picks-title" className="text-h3">Picked for your hour</h3>
    <p className="text-small text-muted mt-2 mb-3">Your current edit, with a little room to discover.</p>
    <ul className="adaptive-list" aria-label="Picked for your hour" onFocusCapture={(event) => { focused.current = (event.target as HTMLElement).closest<HTMLElement>(".product-card-button"); }} onBlurCapture={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) focused.current = null; }}>
      {picks.map(({ product, reason }) => <li key={product.id} className="adaptive-card"><ProductCard product={product} onOpen={onOpen} reason={reason} rail /></li>)}
    </ul>
  </section>;
}
export function RecentlyViewed({ onOpen }: { onOpen: OpenProduct }) {
  const { profile, ready } = useProfile();
  const pieces = profile.recentlyViewed.slice(0, 6).map((id) => products.find((piece) => piece.id === id)!).filter(Boolean);
  return <section aria-labelledby="recent-title" className="recent-slot adaptive-slot mt-6" data-ready={ready}>
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><h3 id="recent-title" className="text-h3">Recently viewed</h3><button type="button" className="choice" onClick={() => { clearRecentlyViewed(); document.querySelector<HTMLElement>(".collection-grid .product-card-button")?.focus(); }}>Clear recently viewed</button></div>
    <ul className="adaptive-list" aria-label="Recently viewed pieces">
      {pieces.map((product) => <li key={product.id} className="adaptive-card"><ProductCard product={product} onOpen={onOpen} rail /></li>)}
    </ul>
  </section>;
}
