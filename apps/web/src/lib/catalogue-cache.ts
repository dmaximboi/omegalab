/**
 * Catalogue list cache — sessionStorage only, 20 minutes of inactivity.
 * Does NOT cache payment/admin/order data. Other tabs still need the network.
 */

const CACHE_KEY = "omega_catalogue_cache_v1";
const IDLE_MS = 20 * 60 * 1000; // 20 minutes

export type CatalogueProduct = {
  id: string;
  slug?: string | null;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  images?: string[];
};

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
    // quota / private mode — ignore
  }
}

export function clearCatalogueCache() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

/** Returns products if cache is still within the inactivity window. */
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

/** Bump last-active timestamp while user is interacting with catalogue. */
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
