"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  EMPTY_CART,
  addItem as addItemPure,
  removeItem as removeItemPure,
  updateQty as updateQtyPure,
  clearCart as clearCartPure,
  subtotal as subtotalPure,
  itemCount as itemCountPure,
  isEmpty as isEmptyPure,
  deserialize,
  serialize,
  storageKey,
  type CartItem,
  type CartState,
} from "@/lib/cart";
import { postCartPing } from "@/lib/api";

/** localStorage key for the browser's stable cart session id. */
const SESSION_KEY_STORAGE = "tenant-site:cart-session";

/** Delay between the last cart mutation and the ping we send. */
const PING_DEBOUNCE_MS = 2000;

function generateSessionKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function loadOrCreateSessionKey(): string {
  try {
    const existing = window.localStorage.getItem(SESSION_KEY_STORAGE);
    if (existing && existing.length >= 8) return existing;
    const fresh = generateSessionKey();
    window.localStorage.setItem(SESSION_KEY_STORAGE, fresh);
    return fresh;
  } catch {
    return generateSessionKey();
  }
}

/**
 * CartProvider — the only piece of client state in the tenant-site.
 *
 * Holds the guest cart in React state + localStorage, scoped by
 * tenantId (so switching tenants in dev doesn't leak carts across
 * hostnames). Hydration quirks handled explicitly:
 *
 *   - SSR render uses EMPTY_CART so server + initial client markup
 *     match (no hydration mismatch).
 *   - After mount, `useEffect` loads the stored cart and swaps state.
 *   - `hydrated` is exposed so cart-dependent UI (e.g. the cart badge
 *     count) can render a placeholder until localStorage has been
 *     read — otherwise the badge would flash "0" then jump to "3".
 *
 * All mutation helpers are stable references (useCallback) so
 * components calling addItem / removeItem inside effects don't
 * re-trigger unnecessarily.
 */

export interface CartContextValue {
  cart: CartState;
  hydrated: boolean;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  isEmpty: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  tenantId,
  host,
  children,
}: {
  tenantId: string;
  host: string;
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartState>(EMPTY_CART);
  const [hydrated, setHydrated] = useState(false);
  const tenantIdRef = useRef(tenantId);
  const hostRef = useRef(host);
  const sessionKeyRef = useRef<string | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage on mount (client only).
  useEffect(() => {
    tenantIdRef.current = tenantId;
    hostRef.current = host;
    try {
      const raw = window.localStorage.getItem(storageKey(tenantId));
      setCart(deserialize(raw));
    } catch {
      setCart(EMPTY_CART);
    }
    sessionKeyRef.current = loadOrCreateSessionKey();
    setHydrated(true);
  }, [tenantId, host]);

  // Debounced cart-abandoned ping. After every change (post-hydration)
  // we schedule a POST to /public/cart-pings; rapid mutations collapse
  // into one ping. Empty cart is also pinged — the server interprets
  // that as a delete. Never throws (postCartPing swallows errors).
  useEffect(() => {
    if (!hydrated) return;
    if (pingTimerRef.current) clearTimeout(pingTimerRef.current);
    const sessionKey = sessionKeyRef.current;
    if (!sessionKey) return;

    pingTimerRef.current = setTimeout(() => {
      const items = cart.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        lineTotal: i.unitPrice * i.quantity,
      }));
      void postCartPing(hostRef.current, {
        sessionKey,
        items,
      });
    }, PING_DEBOUNCE_MS);

    return () => {
      if (pingTimerRef.current) {
        clearTimeout(pingTimerRef.current);
        pingTimerRef.current = null;
      }
    };
  }, [cart, hydrated]);

  // Persist every change after hydration. Skipping the pre-hydration
  // writes keeps the first render from clobbering the stored cart with
  // EMPTY_CART.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        storageKey(tenantIdRef.current),
        serialize(cart),
      );
    } catch {
      // Storage full / disabled / private mode — silently continue.
    }
  }, [cart, hydrated]);

  // Cross-tab sync: if another tab on the same origin mutates the cart,
  // pick up the change. Next.js 16 still runs this correctly inside a
  // client boundary.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== storageKey(tenantIdRef.current)) return;
      setCart(deserialize(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addItem = useCallback<CartContextValue["addItem"]>(
    (item) => setCart((c) => addItemPure(c, item)),
    [],
  );
  const removeItem = useCallback<CartContextValue["removeItem"]>(
    (productId) => setCart((c) => removeItemPure(c, productId)),
    [],
  );
  const updateQty = useCallback<CartContextValue["updateQty"]>(
    (productId, quantity) =>
      setCart((c) => updateQtyPure(c, productId, quantity)),
    [],
  );
  const clearCart = useCallback<CartContextValue["clearCart"]>(
    () => setCart((c) => clearCartPure(c)),
    [],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      hydrated,
      addItem,
      removeItem,
      updateQty,
      clearCart,
      itemCount: itemCountPure(cart),
      subtotal: subtotalPure(cart),
      isEmpty: isEmptyPure(cart),
    }),
    [cart, hydrated, addItem, removeItem, updateQty, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * Returns the cart context. When called outside CartProvider (e.g. in the
 * preview iframe or the 404 page which render SiteHeader without the full
 * app layout), returns a safe stub so CartBadge renders an empty badge
 * instead of crashing with a React context error.
 */
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    // Return a safe stub — CartBadge will show 0 items, AddToCartButton
    // will be inert. This is intentional: preview routes and not-found
    // pages don't have a cart, and crashing the whole page is worse than
    // showing a non-functional badge.
    return {
      cart: EMPTY_CART,
      hydrated: false,
      subtotal: 0,
      itemCount: 0,
      isEmpty: true,
      addItem: () => {},
      removeItem: () => {},
      updateQty: () => {},
      clearCart: () => {},
    } as CartContextValue;
  }
  return ctx;
}
