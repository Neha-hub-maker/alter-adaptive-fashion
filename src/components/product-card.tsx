"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { motion } from "framer-motion";
import { optimizedImagePath } from "@/data/images";
import { formatPrice, type Product } from "@/data/products";
import { durations, easing } from "@/lib/motion";
import { useMotionAllowed } from "@/lib/use-motion-allowed";

export function focusProductInGrid(id: string) {
  (document.querySelector<HTMLElement>(`.collection-grid [data-product-id="${id}"]`) ?? document.getElementById("collection-title"))?.focus();
}

export function ProductCard({ product, onOpen, wide = false, rail = false, reason }: { product: Product; onOpen: (product: Product, trigger: HTMLElement) => void; wide?: boolean; rail?: boolean; reason?: string }) {
  const allowed = useMotionAllowed();
  const [interactive, setInteractive] = useState(false);
  const reasonId = useId();
  return <>
    <button type="button" className="product-card-button" data-product-id={product.id} aria-label={`Quick view: ${product.name}`} aria-describedby={reason ? reasonId : undefined} onClick={(event) => onOpen(product, event.currentTarget)} onMouseEnter={() => { if (window.matchMedia("(hover: hover)").matches) setInteractive(true); }} onMouseLeave={(event) => { if (!event.currentTarget.matches(":focus-visible")) setInteractive(false); }} onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setInteractive(true); }} onBlur={() => setInteractive(false)}>
      <span className="product-card-image">
        <motion.span data-motion-effect className="product-image-scale" animate={{ scale: allowed && interactive ? 1.04 : 1 }} transition={{ duration: allowed ? durations.fast / 1000 : 0, ease: easing }}>
          <Image src={optimizedImagePath(product.imageFile, wide ? 1400 : 800)} alt="" fill loading="lazy" className="object-cover" sizes={rail ? "(min-width: 1440px) 312px, (min-width: 768px) calc(25vw - 48px), (min-width: 400px) 280px, 70vw" : wide ? "(min-width: 1440px) 656px, (min-width: 1024px) calc(50vw - 64px), (min-width: 768px) calc(33.333vw - 53.333px), calc(50vw - 36px)" : "(min-width: 1440px) 312px, (min-width: 1024px) calc(25vw - 48px), (min-width: 768px) calc(33.333vw - 53.333px), calc(50vw - 36px)"} />
        </motion.span>
      </span>
      <span className="block border-t pt-2 product-card-copy">
        <span className="block font-display text-h4 mb-1">{product.name}</span>
        <span className="flex flex-wrap items-center justify-between gap-1"><span className="text-small">{formatPrice(product.price)}</span><span className="card-action-label label text-muted" aria-hidden="true"><motion.span animate={{ opacity: interactive ? 0 : 1 }} transition={{ duration: allowed ? durations.fast / 1000 : 0 }}>{product.mood} edit</motion.span><motion.span animate={{ opacity: interactive ? 1 : 0 }} transition={{ duration: allowed ? durations.fast / 1000 : 0 }}>Quick view</motion.span></span></span>
      </span>
    </button>
    {reason && <p id={reasonId} className="recommendation-reason label text-accent-text mt-2">{reason}</p>}
  </>;
}
