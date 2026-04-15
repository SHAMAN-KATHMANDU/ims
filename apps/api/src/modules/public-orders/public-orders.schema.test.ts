import { describe, it, expect } from "vitest";
import { CreateGuestOrderSchema } from "./public-orders.schema";

const validItem = {
  productId: "11111111-1111-1111-1111-111111111111",
  productName: "Lamp",
  unitPrice: 1000,
  quantity: 1,
  lineTotal: 1000,
};

const validPayload = {
  customerName: "Ada Lovelace",
  customerPhone: "+977 98xxxxxxxx",
  items: [validItem],
};

describe("CreateGuestOrderSchema", () => {
  it("accepts a minimal valid payload", () => {
    const r = CreateGuestOrderSchema.parse(validPayload);
    expect(r.customerName).toBe("Ada Lovelace");
    expect(r.items).toHaveLength(1);
  });

  it("accepts an optional email", () => {
    const r = CreateGuestOrderSchema.parse({
      ...validPayload,
      customerEmail: "ada@example.com",
    });
    expect(r.customerEmail).toBe("ada@example.com");
  });

  it("accepts empty string email (falls through to undefined)", () => {
    const r = CreateGuestOrderSchema.parse({
      ...validPayload,
      customerEmail: "",
    });
    expect(r.customerEmail).toBeUndefined();
  });

  it("rejects an invalid email", () => {
    expect(() =>
      CreateGuestOrderSchema.parse({
        ...validPayload,
        customerEmail: "not-an-email",
      }),
    ).toThrow();
  });

  it("rejects an empty name", () => {
    expect(() =>
      CreateGuestOrderSchema.parse({ ...validPayload, customerName: "" }),
    ).toThrow();
  });

  it("rejects a too-short phone", () => {
    expect(() =>
      CreateGuestOrderSchema.parse({ ...validPayload, customerPhone: "99" }),
    ).toThrow();
  });

  it("rejects an empty cart", () => {
    expect(() =>
      CreateGuestOrderSchema.parse({ ...validPayload, items: [] }),
    ).toThrow();
  });

  it("rejects a cart with >50 items", () => {
    expect(() =>
      CreateGuestOrderSchema.parse({
        ...validPayload,
        items: Array.from({ length: 51 }, () => validItem),
      }),
    ).toThrow();
  });

  it("rejects non-uuid productId", () => {
    expect(() =>
      CreateGuestOrderSchema.parse({
        ...validPayload,
        items: [{ ...validItem, productId: "not-a-uuid" }],
      }),
    ).toThrow();
  });

  it("rejects negative unitPrice", () => {
    expect(() =>
      CreateGuestOrderSchema.parse({
        ...validPayload,
        items: [{ ...validItem, unitPrice: -1 }],
      }),
    ).toThrow();
  });

  it("rejects zero quantity", () => {
    expect(() =>
      CreateGuestOrderSchema.parse({
        ...validPayload,
        items: [{ ...validItem, quantity: 0 }],
      }),
    ).toThrow();
  });
});
