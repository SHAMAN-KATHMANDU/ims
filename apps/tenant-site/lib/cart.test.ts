import { describe, it, expect } from "vitest";
import {
  EMPTY_CART,
  addItem,
  removeItem,
  updateQty,
  clearCart,
  subtotal,
  itemCount,
  isEmpty,
  lineTotal,
  serialize,
  deserialize,
  storageKey,
  type CartState,
} from "./cart";

const lamp = {
  productId: "prod-1",
  productName: "Lamp",
  unitPrice: 1000,
  imageUrl: null,
};

describe("addItem", () => {
  it("adds a new line with default quantity 1", () => {
    const c = addItem(EMPTY_CART, lamp);
    expect(c.items).toHaveLength(1);
    expect(c.items[0]!.quantity).toBe(1);
  });

  it("adds with explicit quantity", () => {
    const c = addItem(EMPTY_CART, { ...lamp, quantity: 3 });
    expect(c.items[0]!.quantity).toBe(3);
  });

  it("merges quantities for the same productId", () => {
    let c = addItem(EMPTY_CART, { ...lamp, quantity: 2 });
    c = addItem(c, { ...lamp, quantity: 3 });
    expect(c.items).toHaveLength(1);
    expect(c.items[0]!.quantity).toBe(5);
  });

  it("clamps merged quantity to 99", () => {
    let c = addItem(EMPTY_CART, { ...lamp, quantity: 90 });
    c = addItem(c, { ...lamp, quantity: 50 });
    expect(c.items[0]!.quantity).toBe(99);
  });

  it("drops the add silently when the cart is at MAX_CART_ITEMS", () => {
    let c = EMPTY_CART;
    for (let n = 0; n < 50; n++) {
      c = addItem(c, { ...lamp, productId: `p-${n}`, productName: `P${n}` });
    }
    expect(c.items).toHaveLength(50);
    const next = addItem(c, { ...lamp, productId: "p-new" });
    expect(next.items).toHaveLength(50);
    expect(next.items.some((i) => i.productId === "p-new")).toBe(false);
  });

  it("never lets quantity drop below 1", () => {
    const c = addItem(EMPTY_CART, { ...lamp, quantity: 0 });
    expect(c.items[0]!.quantity).toBe(1);
  });

  it("floors a non-integer quantity", () => {
    const c = addItem(EMPTY_CART, { ...lamp, quantity: 2.7 });
    expect(c.items[0]!.quantity).toBe(2);
  });

  it("clamps a negative unitPrice to 0", () => {
    const c = addItem(EMPTY_CART, { ...lamp, unitPrice: -50 });
    expect(c.items[0]!.unitPrice).toBe(0);
  });
});

describe("removeItem", () => {
  it("removes the matching line", () => {
    let c = addItem(EMPTY_CART, lamp);
    c = addItem(c, { ...lamp, productId: "prod-2", productName: "Bowl" });
    const next = removeItem(c, "prod-1");
    expect(next.items).toHaveLength(1);
    expect(next.items[0]!.productId).toBe("prod-2");
  });

  it("is a no-op when productId is missing", () => {
    const c = addItem(EMPTY_CART, lamp);
    const next = removeItem(c, "nope");
    expect(next.items).toHaveLength(1);
  });
});

describe("updateQty", () => {
  it("updates quantity", () => {
    const c = addItem(EMPTY_CART, { ...lamp, quantity: 1 });
    const next = updateQty(c, "prod-1", 5);
    expect(next.items[0]!.quantity).toBe(5);
  });

  it("removes the line when quantity drops to 0", () => {
    const c = addItem(EMPTY_CART, { ...lamp, quantity: 3 });
    const next = updateQty(c, "prod-1", 0);
    expect(next.items).toHaveLength(0);
  });

  it("clamps to 99", () => {
    const c = addItem(EMPTY_CART, lamp);
    const next = updateQty(c, "prod-1", 999);
    expect(next.items[0]!.quantity).toBe(99);
  });
});

describe("clearCart", () => {
  it("empties items but keeps currency", () => {
    let c = addItem(EMPTY_CART, lamp);
    c = { ...c, currency: "USD" };
    const next = clearCart(c);
    expect(next.items).toHaveLength(0);
    expect(next.currency).toBe("USD");
  });
});

describe("totals", () => {
  it("lineTotal multiplies", () => {
    expect(lineTotal({ ...lamp, quantity: 3 })).toBe(3000);
  });

  it("subtotal sums all lines", () => {
    let c = addItem(EMPTY_CART, { ...lamp, quantity: 2 });
    c = addItem(c, {
      productId: "prod-2",
      productName: "Bowl",
      unitPrice: 500,
      quantity: 3,
    });
    expect(subtotal(c)).toBe(3500);
  });

  it("itemCount sums quantities", () => {
    let c = addItem(EMPTY_CART, { ...lamp, quantity: 2 });
    c = addItem(c, {
      productId: "prod-2",
      productName: "Bowl",
      unitPrice: 500,
      quantity: 3,
    });
    expect(itemCount(c)).toBe(5);
  });

  it("isEmpty reflects empty state", () => {
    expect(isEmpty(EMPTY_CART)).toBe(true);
    expect(isEmpty(addItem(EMPTY_CART, lamp))).toBe(false);
  });
});

describe("serialize / deserialize round-trip", () => {
  it("round-trips a non-trivial cart", () => {
    let c = addItem(EMPTY_CART, { ...lamp, quantity: 2 });
    c = addItem(c, {
      productId: "prod-2",
      productName: "Bowl",
      unitPrice: 500,
      quantity: 3,
    });
    const raw = serialize(c);
    const restored = deserialize(raw);
    expect(restored).toEqual(c);
  });

  it("deserialize returns empty cart for null", () => {
    expect(deserialize(null)).toEqual(EMPTY_CART);
  });

  it("deserialize returns empty cart for invalid JSON", () => {
    expect(deserialize("not-json")).toEqual(EMPTY_CART);
  });

  it("deserialize returns empty cart when items is missing", () => {
    expect(deserialize(JSON.stringify({ currency: "NPR" }))).toEqual(
      EMPTY_CART,
    );
  });

  it("deserialize drops malformed items but keeps valid ones", () => {
    const raw = JSON.stringify({
      items: [
        lamp && { ...lamp, quantity: 2 },
        { bogus: true },
        { productId: "prod-2", productName: 3, unitPrice: 0, quantity: 1 },
        {
          productId: "prod-3",
          productName: "OK",
          unitPrice: 100,
          quantity: 2,
        },
      ],
      currency: "NPR",
    });
    const restored: CartState = deserialize(raw);
    expect(restored.items).toHaveLength(2);
    expect(restored.items.map((i) => i.productId)).toEqual([
      "prod-1",
      "prod-3",
    ]);
  });

  it("deserialize clamps oversized quantities", () => {
    const raw = JSON.stringify({
      items: [{ ...lamp, quantity: 9999 }],
      currency: "NPR",
    });
    expect(deserialize(raw).items[0]!.quantity).toBe(99);
  });
});

describe("storageKey", () => {
  it("scopes by tenantId", () => {
    expect(storageKey("t1")).toBe("tenant-site:cart:t1");
    expect(storageKey("t2")).toBe("tenant-site:cart:t2");
  });
});
