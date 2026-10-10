"use client";

import { useSyncExternalStore } from "react";
import { products, type ProductColorToken } from "@/data/products";

export interface BagItem { productId: string; size: string; colorToken: ProductColorToken }
interface BagSnapshot { items: readonly BagItem[]; count: number }
const emptyBag: BagSnapshot = { items: [], count: 0 };
const storageKey = "alter-bag";
let snapshot = emptyBag;
let initialized = false;
const listeners = new Set<() => void>();

function isBagItem(value: unknown): value is BagItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<BagItem>;
  const product = products.find((piece) => piece.id === item.productId);
  return !!product && typeof item.size === "string" && product.sizes.includes(item.size) && product.colors.some((color) => color.token === item.colorToken);
}

function initializeBag() {
  if (initialized) return;
  initialized = true;
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (stored?.version === 1 && Array.isArray(stored.items)) {
      const items: BagItem[] = stored.items.filter(isBagItem);
      // Derive count from valid entries instead of trusting a stored counter.
      snapshot = { items, count: items.length };
    }
  } catch { /* Missing, malformed or denied storage leaves the memory bag usable. */ }
}

function subscribeBag(listener: () => void) {
  listeners.add(listener);
  initializeBag();
  return () => { listeners.delete(listener); };
}
function getBagSnapshot() { return snapshot; }
function getServerBagSnapshot() { return emptyBag; }

export function useBag() {
  return useSyncExternalStore(subscribeBag, getBagSnapshot, getServerBagSnapshot);
}

export function addToBag(item: BagItem) {
  if (!isBagItem(item)) throw new Error("Cannot add an unknown product, size or colour to the bag.");
  initializeBag();
  const items = [...snapshot.items, { ...item }];
  snapshot = { items, count: items.length };
  try { localStorage.setItem(storageKey, JSON.stringify({ version: 1, ...snapshot })); } catch { /* Keep the current page session in memory. */ }
  for (const listener of listeners) listener();
}
