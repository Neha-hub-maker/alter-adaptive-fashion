"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Reveal } from "@/components/reveal";
import { stagger } from "@/lib/motion";
import { filterProducts, sortForTheme, productCategories, type ProductCategory, type Product } from "@/data/products";
import { ProductCard, focusProductInGrid } from "@/components/product-card";
import { HourPicks, RecentlyViewed } from "@/components/adaptive-collection";
import { viewProduct } from "@/lib/profile";
import { QuickView } from "@/components/quick-view";
import { useTheme } from "@/lib/use-theme";
import type { Theme } from "@/lib/theme";

function gridColumns() { return window.innerWidth >= 1024 ? 4 : window.innerWidth >= 768 ? 3 : 2; }
function subscribeColumns(callback: () => void) { window.addEventListener("resize", callback); return () => window.removeEventListener("resize", callback); }
function mobileColumns() { return 2; }

export function CollectionSection() {
  const { theme } = useTheme();
  const columns = useSyncExternalStore(subscribeColumns, gridColumns, mobileColumns);
  const [filtered, setFiltered] = useState(false);
  const [mood, setMood] = useState<Theme | "all">("all");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const moodAllRef = useRef<HTMLButtonElement>(null);
  const [selection, setSelection] = useState<{ product: Product; trigger: HTMLElement } | null>(null);
  const openProduct = (product: Product, trigger: HTMLElement) => { viewProduct(product.id); setSelection({ product, trigger }); };
  const closeView = () => {
    const previous = selection;
    setSelection(null);
    if (previous && !previous.trigger.isConnected) requestAnimationFrame(() => focusProductInGrid(previous.product.id));
  };
  const pieces = sortForTheme(filterProducts({ mood: mood === "all" ? undefined : mood, category: category === "all" ? undefined : category }), theme);
  const clearFilters = () => { setMood("all"); setCategory("all"); moodAllRef.current?.focus(); };

  return (
    <section id="collection" aria-labelledby="collection-title" className="canvas guide-block">
      <Reveal className="editorial-grid mb-6">
        <div className="col-span-12 md:col-span-7">
          <p className="label mb-2 text-muted">01 / Collection</p>
          <h2 id="collection-title" tabIndex={-1}>Made for the in-between.</h2>
          <p className="mt-3 max-w-[48ch]">Considered layers, easy tailoring and quiet details. Pieces that move with you, from the first light to the last train.</p>
        </div>
        <div className="col-span-12 md:col-span-5 md:self-end">
          <p className="label mb-2"><span className="day-edit">Day edit leads. Showing pieces for daylight.</span><span className="night-edit">Night edit leads. Showing pieces for the evening.</span></p>
          <p className="text-small text-muted">Concept collection for a portfolio project. Product photography is stock imagery.</p>
        </div>
      </Reveal>
      <Reveal className="collection-filters">
        <fieldset>
          <legend className="label mb-2 text-muted">Mood</legend>
          <div className="flex flex-wrap gap-1">
            {(["all", "day", "night"] as const).map((value) => <button ref={value === "all" ? moodAllRef : undefined} key={value} type="button" className="choice filter-choice" aria-pressed={mood === value} aria-controls="collection-results" onClick={() => { setFiltered(true); setMood(value); }}>{value === "all" ? "All" : value === "day" ? "Day edit" : "Night edit"}</button>)}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label mb-2 text-muted">Category</legend>
          <div className="flex flex-wrap gap-1">
            {(["all", ...productCategories] as const).map((value) => <button key={value} type="button" className="choice filter-choice capitalize" aria-pressed={category === value} aria-controls="collection-results" onClick={() => { setFiltered(true); setCategory(value); }}>{value === "all" ? "All" : value}</button>)}
          </div>
        </fieldset>
      </Reveal>
      <p role="status" aria-live="polite" aria-atomic="true" className="label text-muted my-3">{pieces.length} {pieces.length === 1 ? "piece" : "pieces"}</p>
      <HourPicks onOpen={openProduct} />
      <div id="collection-results">
        {pieces.length > 0 ? <ul className="editorial-grid collection-grid" aria-label="Collection pieces">
          {pieces.map((product, index) => <Reveal tag="li" key={product.id} enabled={!filtered} delay={(columns === 4 ? (index < 3 ? 0 : index < 5 ? 1 : 2 + Math.floor((index - 5) / 4)) : Math.floor(index / columns)) * stagger} className="product-card col-span-6 md:col-span-4 lg:col-span-3">
            <ProductCard product={product} wide={index === 0} onOpen={openProduct} />
          </Reveal>)}
        </ul> : <div className="collection-empty border py-6 px-3">
          <h3 className="text-h4">No pieces in this edit.</h3>
          <p className="my-2 text-small text-muted">Try another mood or category to find your next layer.</p>
          <button type="button" className="choice" onClick={clearFilters}>Clear filters</button>
        </div>}
      </div>
      <RecentlyViewed onOpen={openProduct} />
      {selection && <QuickView key={selection.product.id} product={selection.product} trigger={selection.trigger} onClose={closeView} />}
    </section>
  );
}
