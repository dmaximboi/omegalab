/**
 * Catalogue list cache — sessionStorage only, 20 minutes of inactivity.
 * Does NOT cache payment/admin/order data. Other tabs still need the network.
 */

import type { CatalogueProduct } from "@/lib/catalogue-data";

export type { CatalogueProduct };

const CACHE_KEY = "omega_catalogue_cache_v1";
const IDLE_MS = 20 * 60 * 1000;

type CachePayload = {
  products: CatalogueProduct[];
  savedAt: number;
  lastActiveAt: number;
};

function readRaw(): CachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (!parsed || !Array.isArray(parsed.products) || !parsed.lastActiveAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeRaw(payload: CachePayload) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

export function clearCatalogueCache() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    return;
  }
}

export function getCatalogueCache(): CatalogueProduct[] | null {
  const data = readRaw();
  if (!data) return null;
  if (Date.now() - data.lastActiveAt > IDLE_MS) {
    clearCatalogueCache();
    return null;
  }
  return data.products;
}

export function setCatalogueCache(products: CatalogueProduct[]) {
  const now = Date.now();
  writeRaw({
    products,
    savedAt: now,
    lastActiveAt: now,
  });
}

export function touchCatalogueCache() {
  const data = readRaw();
  if (!data) return;
  if (Date.now() - data.lastActiveAt > IDLE_MS) {
    clearCatalogueCache();
    return;
  }
  writeRaw({ ...data, lastActiveAt: Date.now() });
}

export const CATALOGUE_IDLE_MS = IDLE_MS;
