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
  children,
}: {
  tenantId: string;
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartState>(EMPTY_CART);
  const [hydrated, setHydrated] = useState(false);
  const tenantIdRef = useRef(tenantId);

  // Load from localStorage on mount (client only).
  useEffect(() => {
    tenantIdRef.current = tenantId;
    try {
      const raw = window.localStorage.getItem(storageKey(tenantId));
      setCart(deserialize(raw));
    } catch {
      setCart(EMPTY_CART);
    }
    setHydrated(true);
  }, [tenantId]);

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

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error(
      "useCart must be called inside <CartProvider>. Make sure the component tree is wrapped at the app layout level.",
    );
  }
  return ctx;
}
