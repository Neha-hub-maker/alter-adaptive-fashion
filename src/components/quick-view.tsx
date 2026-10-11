"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, type MouseEvent } from "react";
import type { Product } from "@/data/products";
import { openDialog, trapDialogFocus } from "@/lib/dialog";

// The native shell opens immediately, so loading never postpones focus trapping.
const QuickViewContent = dynamic(() => import("./quick-view-content"), { ssr: false, loading: () => <p className="py-6" role="status">Loading the piece…</p> });
export function QuickView({ product, trigger, onClose }: { product: Product; trigger: HTMLElement; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (dialog.current) return openDialog(dialog.current, trigger); }, [trigger]);
  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  };
  return <dialog ref={dialog} className="quick-view" aria-labelledby="quick-view-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={closeOnBackdrop} onKeyDown={trapDialogFocus}>
    <span id="quick-view-title" className="sr-only">{product.name}</span>
    <div className="quick-view-top"><span className="label text-muted">Collection / Quick view</span><button type="button" className="choice label" onClick={onClose}>Close</button></div>
    <QuickViewContent product={product} />
  </dialog>;
}
