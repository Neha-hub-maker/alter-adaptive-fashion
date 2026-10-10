"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MoodControl } from "@/components/theme-controls";
import { BagCounter } from "@/components/bag-counter";
import { openDialog, trapDialogFocus } from "@/lib/dialog";
import { startThemeClock } from "@/lib/theme";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
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
    const closeDialog = openDialog(dialog, menuButton);
    const desktop = window.matchMedia("(min-width: 768px)");
    const onResize = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", onResize);
    return () => {
      desktop.removeEventListener("change", onResize);
      closeDialog();
    };
  }, [open]);

  const trapFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
    trapDialogFocus(event);
  };
  const exploreCollection = () => { if (pathname !== "/") router.push("/#collection"); else document.getElementById("collection")?.scrollIntoView({ block: "start" }); };

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="site-header">
        <div className="canvas flex h-full items-center justify-between gap-3">
          <Link href="/" className="inline-flex min-h-[44px] items-center font-display text-h3 tracking-[-0.04em]" aria-label="ALTER home">ALTER</Link>
          <div className="flex items-center gap-1 md:gap-2 lg:gap-4">
            <div className="hidden items-center gap-2 lg:gap-4 md:flex">
              <nav aria-label="Main navigation" className="flex gap-3 text-small">
                <Link href={href("collection")}>Collection</Link>
                <Link href={href("story")}>Story</Link>
              </nav>
              <MoodControl compact />
            </div>
            <BagCounter onClick={exploreCollection} />
            <button ref={buttonRef} type="button" className="choice label md:hidden" aria-expanded={open} aria-controls="alter-menu-panel" onClick={() => setOpen(true)}>Menu</button>
          </div>
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
        <div className="mb-4"><BagCounter onClick={() => { setOpen(false); requestAnimationFrame(exploreCollection); }} /></div>
        <MoodControl />
      </dialog>
    </>
  );
}
