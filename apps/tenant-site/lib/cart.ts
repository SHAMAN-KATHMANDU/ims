/**
 * Guest cart — pure helper functions + types. No React, no DOM, no storage.
 *
 * The tenant-site doesn't have user accounts (that's the whole point of
 * Phase E — guest checkout). Cart state lives entirely in the visitor's
 * browser (localStorage, scoped by tenantId) and gets submitted to the
 * public `/public/orders` endpoint at checkout time.
 *
 * This module is the deterministic, easy-to-test core: reducers that
 * take a cart and a mutation and return a new cart. The CartProvider
 * imports these to drive React state. Keeping the logic here means unit
 * tests can cover every edge case without spinning up React.
 */

export type Currency = string;

export interface CartItem {
  productId: string;
  productName: string;
  /** Price snapshot at the moment the item was added. */
  unitPrice: number;
  /** 1..99 */
  quantity: number;
  /** Optional image for the cart thumbnail. */
  imageUrl?: string | null;
  /**
   * Variation selected on the PDP. When present it flows through to the
   * SaleItem on conversion; when absent the server falls back to the
   * product's first active variation (legacy single-variation flow).
   */
  variationId?: string | null;
  subVariationId?: string | null;
  /**
   * Human-readable summary of the variation (e.g. "Red / M"). Shown in
   * the cart line; not authoritative for pricing.
   */
  variationLabel?: string | null;
}

export interface CartState {
  items: CartItem[];
  currency: Currency;
}

export const EMPTY_CART: CartState = {
  items: [],
  currency: "NPR",
};

const MAX_CART_ITEMS = 50;
const MAX_LINE_QTY = 99;

function clampQty(q: number): number {
  if (!Number.isFinite(q)) return 1;
  return Math.max(1, Math.min(MAX_LINE_QTY, Math.floor(q)));
}

/**
 * Cart identity key: same productId + same selected variation + same
 * sub-variation merge into a single line. Missing values coerce to ""
 * so legacy items (no variation) don't collide with variation-tagged
 * ones for the same product.
 */
function cartKey(
  item: Pick<CartItem, "productId" | "variationId" | "subVariationId">,
): string {
  return `${item.productId}:${item.variationId ?? ""}:${item.subVariationId ?? ""}`;
}

/**
 * Add a product to the cart, merging with any existing line that shares
 * the same (productId, variationId, subVariationId). Quantities beyond
 * MAX_LINE_QTY are clamped silently.
 */
export function addItem(
  cart: CartState,
  item: Omit<CartItem, "quantity"> & { quantity?: number },
): CartState {
  const addQty = clampQty(item.quantity ?? 1);
  const key = cartKey(item);
  const existing = cart.items.findIndex((i) => cartKey(i) === key);

  if (existing >= 0) {
    const next = cart.items.slice();
    const merged = next[existing]!;
    next[existing] = {
      ...merged,
      quantity: clampQty(merged.quantity + addQty),
    };
    return { ...cart, items: next };
  }

  if (cart.items.length >= MAX_CART_ITEMS) {
    // Silently drop the add — the UI layer surfaces a toast.
    return cart;
  }

  return {
    ...cart,
    items: [
      ...cart.items,
      {
        productId: item.productId,
        productName: item.productName,
        unitPrice: Math.max(0, item.unitPrice),
        quantity: addQty,
        imageUrl: item.imageUrl ?? null,
        variationId: item.variationId ?? null,
        subVariationId: item.subVariationId ?? null,
        variationLabel: item.variationLabel ?? null,
      },
    ],
  };
}

/**
 * Legacy callers identified lines by productId alone. Both `removeItem`
 * and `updateQty` now accept an optional variation tuple and fall back
 * to "all lines matching this productId" when neither is passed.
 */
export function removeItem(
  cart: CartState,
  productId: string,
  opts?: { variationId?: string | null; subVariationId?: string | null },
): CartState {
  const targetKey = opts
    ? cartKey({
        productId,
        variationId: opts.variationId ?? null,
        subVariationId: opts.subVariationId ?? null,
      })
    : null;
  return {
    ...cart,
    items: cart.items.filter((i) =>
      targetKey ? cartKey(i) !== targetKey : i.productId !== productId,
    ),
  };
}

export function updateQty(
  cart: CartState,
  productId: string,
  quantity: number,
  opts?: { variationId?: string | null; subVariationId?: string | null },
): CartState {
  if (quantity <= 0) return removeItem(cart, productId, opts);
  const targetKey = opts
    ? cartKey({
        productId,
        variationId: opts.variationId ?? null,
        subVariationId: opts.subVariationId ?? null,
      })
    : null;
  return {
    ...cart,
    items: cart.items.map((i) => {
      const matches = targetKey
        ? cartKey(i) === targetKey
        : i.productId === productId;
      return matches ? { ...i, quantity: clampQty(quantity) } : i;
    }),
  };
}

export function clearCart(cart: CartState): CartState {
  return { ...cart, items: [] };
}

// ============================================================================
// Derived totals
// ============================================================================

export function lineTotal(item: CartItem): number {
  return item.unitPrice * item.quantity;
}

export function subtotal(cart: CartState): number {
  return cart.items.reduce((sum, i) => sum + lineTotal(i), 0);
}

export function itemCount(cart: CartState): number {
  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}

export function isEmpty(cart: CartState): boolean {
  return cart.items.length === 0;
}

// ============================================================================
// Storage — localStorage shape guarded against old / corrupt payloads
// ============================================================================

export const STORAGE_KEY_PREFIX = "tenant-site:cart";

export function storageKey(tenantId: string): string {
  return `${STORAGE_KEY_PREFIX}:${tenantId}`;
}

/**
 * Deserialize a saved cart from a JSON string. Rejects anything that
 * doesn't look like the current shape and returns the empty cart — we
 * don't try to migrate old formats, we just start fresh.
 */
export function deserialize(raw: string | null): CartState {
  if (!raw) return EMPTY_CART;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return EMPTY_CART;
    const obj = parsed as { items?: unknown; currency?: unknown };
    if (!Array.isArray(obj.items)) return EMPTY_CART;
    const items: CartItem[] = [];
    for (const raw of obj.items) {
      if (!raw || typeof raw !== "object") continue;
      const i = raw as Record<string, unknown>;
      if (
        typeof i.productId === "string" &&
        typeof i.productName === "string" &&
        typeof i.unitPrice === "number" &&
        typeof i.quantity === "number"
      ) {
        items.push({
          productId: i.productId,
          productName: i.productName,
          unitPrice: Math.max(0, i.unitPrice),
          quantity: clampQty(i.quantity),
          imageUrl:
            typeof i.imageUrl === "string" || i.imageUrl === null
              ? (i.imageUrl as string | null)
              : null,
          variationId: typeof i.variationId === "string" ? i.variationId : null,
          subVariationId:
            typeof i.subVariationId === "string" ? i.subVariationId : null,
          variationLabel:
            typeof i.variationLabel === "string" ? i.variationLabel : null,
        });
      }
    }
    return {
      items: items.slice(0, MAX_CART_ITEMS),
      currency: typeof obj.currency === "string" ? obj.currency : "NPR",
    };
  } catch {
    return EMPTY_CART;
  }
}

export function serialize(cart: CartState): string {
  return JSON.stringify(cart);
}
