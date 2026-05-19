export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

const CART_STORAGE_KEY = "omega_cart";
const MAX_CART_ITEMS = 50;
const MAX_QUANTITY_PER_ITEM = 100;

// Sanitize a string to prevent XSS via localStorage injection
function sanitizeString(str: unknown): string {
  if (typeof str !== "string") return "";
  return str.replace(/[<>"'&]/g, "").slice(0, 500);
}

// Validate a cart item structure to prevent tampered data from localStorage
function isValidCartItem(item: unknown): item is CartItem {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === "string" && obj.id.length > 0 && obj.id.length <= 50 &&
    typeof obj.name === "string" && obj.name.length > 0 &&
    typeof obj.price === "number" && obj.price > 0 && isFinite(obj.price) &&
    typeof obj.image === "string" &&
    typeof obj.quantity === "number" && obj.quantity >= 1 && obj.quantity <= MAX_QUANTITY_PER_ITEM &&
    Number.isInteger(obj.quantity)
  );
}

export const cart = {
  getItems(): CartItem[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      // Validate every item — reject tampered data
      return parsed
        .filter(isValidCartItem)
        .slice(0, MAX_CART_ITEMS)
        .map((item) => ({
          id: sanitizeString(item.id),
          name: sanitizeString(item.name),
          price: Math.abs(Number(item.price)),
          image: sanitizeString(item.image),
          quantity: Math.min(MAX_QUANTITY_PER_ITEM, Math.max(1, Math.floor(item.quantity))),
        }));
    } catch {
      // Corrupted localStorage — clear it
      localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }
  },

  addItem(product: { id: string; name: string; price: number; image: string }) {
    if (!product.id || !product.name || product.price <= 0) return;

    const items = this.getItems();

    // Prevent cart overflow
    if (items.length >= MAX_CART_ITEMS) return;

    const existingItem = items.find((item) => item.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= MAX_QUANTITY_PER_ITEM) return;
      existingItem.quantity += 1;
    } else {
      items.push({
        id: sanitizeString(product.id),
        name: sanitizeString(product.name),
        price: Math.abs(Number(product.price)),
        image: sanitizeString(product.image),
        quantity: 1,
      });
    }

    this.saveItems(items);
  },

  removeItem(id: string) {
    const items = this.getItems().filter((item) => item.id !== id);
    this.saveItems(items);
  },

  updateQuantity(id: string, quantity: number) {
    if (quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM || !Number.isInteger(quantity)) return;

    const items = this.getItems();
    const item = items.find((item) => item.id === id);

    if (item) {
      item.quantity = Math.min(MAX_QUANTITY_PER_ITEM, Math.max(1, Math.floor(quantity)));
      this.saveItems(items);
    }
  },

  clear() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  },

  getTotal(): number {
    const items = this.getItems();
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  },

  getItemCount(): number {
    const items = this.getItems();
    return items.reduce((count, item) => count + item.quantity, 0);
  },

  saveItems(items: CartItem[]) {
    if (typeof window !== "undefined") {
      try {
        // Only save validated items
        const safe = items.filter(isValidCartItem).slice(0, MAX_CART_ITEMS);
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(safe));
      } catch {
        // localStorage full or disabled — fail silently
      }
    }
  },
};
