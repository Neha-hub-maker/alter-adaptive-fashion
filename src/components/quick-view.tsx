"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { images, optimizedImagePath } from "@/data/images";
import { formatPrice, type Product } from "@/data/products";
import { addToBag, useBag } from "@/lib/bag";
import { openDialog, trapDialogFocus } from "@/lib/dialog";

export function QuickView({ product, trigger, onClose }: { product: Product; trigger: HTMLElement; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sizeRef = useRef<HTMLFieldSetElement>(null);
  const [size, setSize] = useState("");
  const [color, setColor] = useState(product.colors[0].token);
  const [sizeError, setSizeError] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const { count } = useBag();
  const image = images.find((asset) => asset.file === product.imageFile)!;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog) return openDialog(dialog, trigger);
  }, [trigger]);
  useEffect(() => {
    if (!confirmation) return;
    const timer = window.setTimeout(() => setConfirmation(""), 5000);
    return () => window.clearTimeout(timer);
  }, [confirmation, count]);

  const add = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!size) {
      setSizeError(true);
      sizeRef.current?.focus();
      return;
    }
    addToBag({ productId: product.id, size, colorToken: color });
    setConfirmation(`Added: ${product.name}, size ${size}`);
  };
  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  };

  return (
    <dialog ref={dialogRef} className="quick-view" aria-labelledby="quick-view-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={closeOnBackdrop} onKeyDown={trapDialogFocus}>
      <div className="quick-view-top"><span className="label text-muted">Collection / Quick view</span><button type="button" className="choice label" onClick={onClose}>Close</button></div>
      <div className="quick-view-grid">
        <div className="quick-view-image">
          <Image src={optimizedImagePath(product.imageFile, 1400)} alt={image.alt} fill sizes="(min-width: 1144px) 499px, (min-width: 768px) calc(50vw - 73px), calc(100vw - 48px)" loading="eager" className="object-cover" />
        </div>
        <div className="quick-view-copy">
          <p className="label text-muted mb-2">{product.mood} edit / {product.category}</p>
          <h2 id="quick-view-title" className="text-h3">{product.name}</h2>
          <p className="mt-2">{formatPrice(product.price)}</p>
          <p className="mt-3">{product.description}</p>
          <ul className="my-3 list-disc pl-3 text-small text-muted">{product.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
          <form noValidate onSubmit={add}>
            <fieldset className="mb-3">
              <legend className="label mb-2">Colour</legend>
              <div className="flex flex-wrap gap-1">
                {product.colors.map((option) => <label className="choice" key={option.token}>
                  <input className="sr-only" type="radio" name={`colour-${product.id}`} value={option.token} checked={color === option.token} onChange={() => setColor(option.token)} />
                  <span aria-hidden="true" className="h-2 w-2 border border-current" style={{ backgroundColor: `var(--${option.token})` }} />
                  <span>{option.name}</span>
                </label>)}
              </div>
            </fieldset>
            <fieldset ref={sizeRef} tabIndex={-1} className="size-group mb-3" aria-invalid={sizeError || undefined} aria-describedby={sizeError ? "quick-size-error" : undefined}>
              <legend className="label mb-2">Size (required)</legend>
              <div className="flex flex-wrap gap-1">
                {product.sizes.map((option) => <label className="choice" key={option}>
                  <input className="sr-only" type="radio" required name={`size-${product.id}`} value={option} checked={size === option} onChange={() => { setSize(option); setSizeError(false); }} />
                  <span>{option}</span>
                </label>)}
              </div>
              {sizeError && <p id="quick-size-error" role="alert" className="mt-2 text-small">Choose a size before adding to your bag.</p>}
            </fieldset>
            <button type="submit" className="primary-button label w-full">Add to bag</button>
            <p aria-live="polite" aria-atomic="true" className="bag-confirmation mt-2 text-small"><span key={count}>{confirmation}</span></p>
          </form>
          <p className="text-small text-muted mt-2">Concept piece. Stock photography used as an editorial reference.</p>
        </div>
      </div>
    </dialog>
  );
}
