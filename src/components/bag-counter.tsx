"use client";

import { useBag } from "@/lib/bag";

export function BagCounter({ onClick }: { onClick?: () => void }) {
  const { count } = useBag();
  return <button type="button" className="choice label whitespace-nowrap" onClick={onClick}>Bag ({count})</button>;
}
