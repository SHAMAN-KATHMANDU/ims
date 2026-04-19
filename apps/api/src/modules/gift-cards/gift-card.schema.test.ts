import { describe, it, expect } from "vitest";
import {
  CreateGiftCardSchema,
  UpdateGiftCardSchema,
  RedeemGiftCardSchema,
  GiftCardListQuerySchema,
} from "./gift-card.schema";

describe("CreateGiftCardSchema", () => {
  it("accepts valid minimal payload", () => {
    const r = CreateGiftCardSchema.parse({
      code: "GIFT-ABC-123",
      amount: 5000,
    });
    expect(r.code).toBe("GIFT-ABC-123");
    expect(r.amount).toBe(5000);
    expect(r.status).toBe("ACTIVE");
  });

  it("uppercases and trims code", () => {
    const r = CreateGiftCardSchema.parse({
      code: "  giftcode  ",
      amount: 100,
    });
    expect(r.code).toBe("GIFTCODE");
  });

  it("rejects code with invalid chars", () => {
    expect(() =>
      CreateGiftCardSchema.parse({ code: "INVALID CODE!", amount: 100 }),
    ).toThrow();
  });

  it("rejects non-positive amount", () => {
    expect(() =>
      CreateGiftCardSchema.parse({ code: "CODE123", amount: 0 }),
    ).toThrow();
    expect(() =>
      CreateGiftCardSchema.parse({ code: "CODE123", amount: -1 }),
    ).toThrow();
  });

  it("lowercases recipientEmail", () => {
    const r = CreateGiftCardSchema.parse({
      code: "CODE123",
      amount: 100,
      recipientEmail: "User@Example.COM",
    });
    expect(r.recipientEmail).toBe("user@example.com");
  });

  it("coerces expiresAt string to Date", () => {
    const r = CreateGiftCardSchema.parse({
      code: "CODE123",
      amount: 100,
      expiresAt: "2027-01-01T00:00:00Z",
    });
    expect(r.expiresAt).toBeInstanceOf(Date);
  });
});

describe("UpdateGiftCardSchema", () => {
  it("accepts status only", () => {
    const r = UpdateGiftCardSchema.parse({ status: "VOIDED" });
    expect(r.status).toBe("VOIDED");
  });

  it("accepts empty body (no-op)", () => {
    const r = UpdateGiftCardSchema.parse({});
    expect(r.status).toBeUndefined();
    expect(r.balance).toBeUndefined();
  });

  it("rejects negative balance", () => {
    expect(() => UpdateGiftCardSchema.parse({ balance: -1 })).toThrow();
  });
});

describe("RedeemGiftCardSchema", () => {
  it("parses valid payload", () => {
    const r = RedeemGiftCardSchema.parse({ code: "gift123", amount: 500 });
    expect(r.code).toBe("GIFT123");
    expect(r.amount).toBe(500);
  });

  it("rejects amount <= 0", () => {
    expect(() =>
      RedeemGiftCardSchema.parse({ code: "GIFT123", amount: 0 }),
    ).toThrow();
  });
});

describe("GiftCardListQuerySchema", () => {
  it("defaults pagination", () => {
    const r = GiftCardListQuerySchema.parse({});
    expect(r.page).toBe(1);
    expect(r.limit).toBe(20);
  });

  it("parses status enum", () => {
    const r = GiftCardListQuerySchema.parse({ status: "REDEEMED" });
    expect(r.status).toBe("REDEEMED");
  });
});
