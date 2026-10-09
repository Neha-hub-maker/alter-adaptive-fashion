"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MoodControl } from "@/components/theme-controls";
import { startThemeClock } from "@/lib/theme";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const href = (anchor: string) => pathname === "/" ? `#${anchor}` : `/#${anchor}`;

  useEffect(startThemeClock, []);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const menuButton = buttonRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal(); // Native modal semantics make the rest of the page inert.
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 768px)");
    const onResize = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", onResize);
    return () => {
      desktop.removeEventListener("change", onResize);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      menuButton?.focus({ preventScroll: true });
    };
  }, [open]);

  const trapFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
    if (event.key !== "Tab") return;
    const elements = [...event.currentTarget.querySelectorAll<HTMLElement>("a[href], button, input, [tabindex='0']")]
      .filter((element) => element.tabIndex >= 0 && !element.hasAttribute("disabled") && (!(element instanceof HTMLInputElement) || element.type !== "radio" || element.checked));
    const first = elements[0];
    const last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="site-header">
        <div className="canvas flex h-full items-center justify-between gap-3">
          <Link href="/" className="font-display text-h3 tracking-[-0.04em]" aria-label="ALTER home">ALTER</Link>
          <div className="hidden items-center gap-4 md:flex">
            <nav aria-label="Main navigation" className="flex gap-3 text-small">
              <Link href={href("collection")}>Collection</Link>
              <Link href={href("story")}>Story</Link>
            </nav>
            <MoodControl compact />
          </div>
          <button ref={buttonRef} type="button" className="choice label md:hidden" aria-expanded={open} aria-controls="alter-menu-panel" onClick={() => setOpen(true)}>Menu</button>
        </div>
      </header>
      <dialog ref={dialogRef} id="alter-menu-panel" className="mobile-panel" aria-labelledby="mobile-menu-title" onKeyDown={trapFocus} onCancel={(event) => { event.preventDefault(); setOpen(false); }}>
        <div className="flex items-center justify-between gap-3 border-b pb-3">
          <h2 id="mobile-menu-title" className="font-display text-h3">ALTER / Menu</h2>
          <button type="button" className="choice label" onClick={() => setOpen(false)}>Close menu</button>
        </div>
        <nav aria-label="Mobile navigation" className="my-6 flex flex-col gap-4 font-display text-h2">
          <Link href={href("collection")} onClick={() => setOpen(false)}>Collection</Link>
          <Link href={href("story")} onClick={() => setOpen(false)}>Story</Link>
        </nav>
        <MoodControl />
      </dialog>
    </>
  );
}
