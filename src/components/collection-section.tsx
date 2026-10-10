"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { optimizedImagePath } from "@/data/images";
import { filterProducts, sortForTheme, formatPrice, productCategories, type ProductCategory, type Product } from "@/data/products";
import { QuickView } from "@/components/quick-view";
import { useTheme } from "@/lib/use-theme";
import type { Theme } from "@/lib/theme";

export function CollectionSection() {
  const { theme } = useTheme();
  const [mood, setMood] = useState<Theme | "all">("all");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const moodAllRef = useRef<HTMLButtonElement>(null);
  const [selection, setSelection] = useState<{ product: Product; trigger: HTMLElement } | null>(null);
  const pieces = sortForTheme(filterProducts({ mood: mood === "all" ? undefined : mood, category: category === "all" ? undefined : category }), theme);
  const clearFilters = () => { setMood("all"); setCategory("all"); moodAllRef.current?.focus(); };

  return (
    <section id="collection" aria-labelledby="collection-title" className="canvas guide-block">
      <div className="editorial-grid mb-6">
        <div className="col-span-12 md:col-span-7">
          <p className="label mb-2 text-muted">01 / Collection</p>
          <h2 id="collection-title">Made for the in-between.</h2>
          <p className="mt-3 max-w-[48ch]">Considered layers, easy tailoring and quiet details. Pieces that move with you, from the first light to the last train.</p>
        </div>
        <div className="col-span-12 md:col-span-5 md:self-end">
          <p className="label mb-2">{theme === "day" ? "Day edit leads. Showing pieces for daylight." : "Night edit leads. Showing pieces for the evening."}</p>
          <p className="text-small text-muted">Concept collection for a portfolio project. Product photography is stock imagery.</p>
        </div>
      </div>
      <div className="collection-filters">
        <fieldset>
          <legend className="label mb-2 text-muted">Mood</legend>
          <div className="flex flex-wrap gap-1">
            {(["all", "day", "night"] as const).map((value) => <button ref={value === "all" ? moodAllRef : undefined} key={value} type="button" className="choice filter-choice" aria-pressed={mood === value} aria-controls="collection-results" onClick={() => setMood(value)}>{value === "all" ? "All" : value === "day" ? "Day edit" : "Night edit"}</button>)}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label mb-2 text-muted">Category</legend>
          <div className="flex flex-wrap gap-1">
            {(["all", ...productCategories] as const).map((value) => <button key={value} type="button" className="choice filter-choice capitalize" aria-pressed={category === value} aria-controls="collection-results" onClick={() => setCategory(value)}>{value === "all" ? "All" : value}</button>)}
          </div>
        </fieldset>
      </div>
      <p role="status" aria-live="polite" aria-atomic="true" className="label text-muted my-3">{pieces.length} {pieces.length === 1 ? "piece" : "pieces"}</p>
      <div id="collection-results">
        {pieces.length > 0 ? <ul className="editorial-grid collection-grid" aria-label="Collection pieces">
          {pieces.map((product, index) => <li key={product.id} className="product-card col-span-6 md:col-span-4 lg:col-span-3">
            <button type="button" className="product-card-button" aria-label={`Quick view: ${product.name}`} onClick={(event) => setSelection({ product, trigger: event.currentTarget })}>
              <span className="product-card-image">
                <Image src={optimizedImagePath(product.imageFile, index === 0 ? 1400 : 800)} alt="" fill loading="lazy" className="object-cover" sizes={index === 0 ? "(min-width: 1440px) 656px, (min-width: 1024px) calc(50vw - 64px), (min-width: 768px) calc(33.333vw - 53.333px), calc(50vw - 36px)" : "(min-width: 1440px) 312px, (min-width: 1024px) calc(25vw - 48px), (min-width: 768px) calc(33.333vw - 53.333px), calc(50vw - 36px)"} />
              </span>
              <span className="block border-t pt-2">
                <span className="block font-display text-h4 mb-1">{product.name}</span>
                <span className="flex flex-wrap items-center justify-between gap-1"><span className="text-small">{formatPrice(product.price)}</span><span className="label text-muted">{product.mood} edit</span></span>
              </span>
            </button>
          </li>)}
        </ul> : <div className="collection-empty border py-6 px-3">
          <h3 className="text-h4">No pieces in this edit.</h3>
          <p className="my-2 text-small text-muted">Try another mood or category to find your next layer.</p>
          <button type="button" className="choice" onClick={clearFilters}>Clear filters</button>
        </div>}
      </div>
      {selection && <QuickView key={selection.product.id} product={selection.product} trigger={selection.trigger} onClose={() => setSelection(null)} />}
    </section>
  );
}
