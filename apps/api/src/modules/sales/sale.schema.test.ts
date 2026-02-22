import { describe, it, expect } from "vitest";
import {
  addSalePaymentSchema,
  createSaleSchema,
  previewSaleSchema,
  saleIdParamsSchema,
  salesByLocationQuerySchema,
  salesDailyQuerySchema,
  salesListQuerySchema,
  salesSinceLoginQuerySchema,
  salesSummaryQuerySchema,
} from "./sale.schema";

describe("sale schemas", () => {
  it("validates createSaleSchema with trimmed payload", () => {
    const parsed = createSaleSchema.parse({
      locationId: " loc-1 ",
      items: [{ variationId: " var-1 ", quantity: 2 }],
      notes: " quick sale ",
    });

    expect(parsed.locationId).toBe("loc-1");
    expect(parsed.items[0]?.variationId).toBe("var-1");
    expect(parsed.notes).toBe("quick sale");
  });

  it("rejects empty create items", () => {
    const result = createSaleSchema.safeParse({
      locationId: "loc-1",
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("validates previewSaleSchema", () => {
    const parsed = previewSaleSchema.parse({
      locationId: "loc-1",
      items: [{ variationId: "var-1", quantity: 1 }],
    });
    expect(parsed.items.length).toBe(1);
  });

  it("validates addSalePaymentSchema", () => {
    const parsed = addSalePaymentSchema.parse({
      method: "CASH",
      amount: "1000",
    });
    expect(parsed.method).toBe("CASH");
    expect(parsed.amount).toBe(1000);
  });

  it("rejects invalid payment method", () => {
    const result = addSalePaymentSchema.safeParse({
      method: "BANK",
      amount: 1000,
    });
    expect(result.success).toBe(false);
  });

  it("validates saleIdParamsSchema", () => {
    const parsed = saleIdParamsSchema.parse({ id: "sale-1" });
    expect(parsed.id).toBe("sale-1");
  });

  it("validates sales list query schema", () => {
    const parsed = salesListQuerySchema.parse({
      page: "2",
      limit: "20",
      type: "MEMBER",
      isCreditSale: "true",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(20);
    expect(parsed.type).toBe("MEMBER");
    expect(parsed.isCreditSale).toBe(true);
  });

  it("validates sales analytics query schemas", () => {
    const sinceLogin = salesSinceLoginQuerySchema.parse({
      page: "1",
      limit: "10",
    });
    const summary = salesSummaryQuerySchema.parse({
      locationId: "loc-1",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
    const byLocation = salesByLocationQuerySchema.parse({
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
    const daily = salesDailyQuerySchema.parse({ days: "7" });

    expect(sinceLogin.limit).toBe(10);
    expect(summary.locationId).toBe("loc-1");
    expect(byLocation.startDate).toBe("2026-01-01");
    expect(daily.days).toBe(7);
  });
});
