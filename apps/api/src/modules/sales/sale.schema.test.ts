import { describe, it, expect } from "vitest";
import {
  CreateSaleSchema,
  PreviewSaleSchema,
  AddPaymentSchema,
  GetAllSalesQuerySchema,
  GetSalesSummaryQuerySchema,
  GetSalesByLocationQuerySchema,
  GetDailySalesQuerySchema,
  DownloadSalesQuerySchema,
} from "./sale.schema";

describe("CreateSaleSchema", () => {
  it("accepts valid payload", () => {
    const result = CreateSaleSchema.parse({
      locationId: "550e8400-e29b-41d4-a716-446655440000",
      items: [
        {
          variationId: "550e8400-e29b-41d4-a716-446655440001",
          quantity: 2,
        },
      ],
    });
    expect(result.locationId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.items).toHaveLength(1);
    expect(result.items[0].variationId).toBe(
      "550e8400-e29b-41d4-a716-446655440001",
    );
    expect(result.items[0].quantity).toBe(2);
  });

  it("accepts optional memberPhone, memberName, payments", () => {
    const result = CreateSaleSchema.parse({
      locationId: "550e8400-e29b-41d4-a716-446655440000",
      memberPhone: "+9779812345678",
      memberName: "John",
      isCreditSale: false,
      items: [
        { variationId: "550e8400-e29b-41d4-a716-446655440001", quantity: 1 },
      ],
      notes: "Test",
      payments: [{ method: "CASH", amount: 100 }],
    });
    expect(result.memberPhone).toBe("+9779812345678");
    expect(result.memberName).toBe("John");
    expect(result.payments).toHaveLength(1);
    expect(result.payments![0].method).toBe("CASH");
    expect(result.payments![0].amount).toBe(100);
  });

  it("rejects when locationId is missing", () => {
    expect(() =>
      CreateSaleSchema.parse({
        items: [
          { variationId: "550e8400-e29b-41d4-a716-446655440001", quantity: 1 },
        ],
      }),
    ).toThrow();
  });

  it("rejects when items is empty", () => {
    expect(() =>
      CreateSaleSchema.parse({
        locationId: "550e8400-e29b-41d4-a716-446655440000",
        items: [],
      }),
    ).toThrow();
  });

  it("rejects invalid UUID for locationId", () => {
    expect(() =>
      CreateSaleSchema.parse({
        locationId: "not-a-uuid",
        items: [
          { variationId: "550e8400-e29b-41d4-a716-446655440001", quantity: 1 },
        ],
      }),
    ).toThrow();
  });
});

describe("PreviewSaleSchema", () => {
  it("accepts valid payload", () => {
    const result = PreviewSaleSchema.parse({
      locationId: "550e8400-e29b-41d4-a716-446655440000",
      items: [
        { variationId: "550e8400-e29b-41d4-a716-446655440001", quantity: 1 },
      ],
    });
    expect(result.locationId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.items).toHaveLength(1);
  });

  it("rejects when items is missing", () => {
    expect(() =>
      PreviewSaleSchema.parse({
        locationId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toThrow();
  });
});

describe("AddPaymentSchema", () => {
  it("accepts valid payload", () => {
    const result = AddPaymentSchema.parse({
      method: "CASH",
      amount: 500,
    });
    expect(result.method).toBe("CASH");
    expect(result.amount).toBe(500);
  });

  it("accepts all payment methods", () => {
    const methods = ["CASH", "CARD", "CHEQUE", "FONEPAY", "QR"];
    for (const method of methods) {
      const result = AddPaymentSchema.parse({ method, amount: 100 });
      expect(result.method).toBe(method);
    }
  });

  it("rejects invalid payment method", () => {
    expect(() =>
      AddPaymentSchema.parse({ method: "INVALID", amount: 100 }),
    ).toThrow();
  });

  it("rejects zero or negative amount", () => {
    expect(() =>
      AddPaymentSchema.parse({ method: "CASH", amount: 0 }),
    ).toThrow();
    expect(() =>
      AddPaymentSchema.parse({ method: "CASH", amount: -10 }),
    ).toThrow();
  });
});

describe("GetAllSalesQuerySchema", () => {
  it("accepts minimal query with defaults", () => {
    const result = GetAllSalesQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.sortBy).toBe("createdAt");
    expect(result.sortOrder).toBe("desc");
  });

  it("parses isCreditSale string to boolean", () => {
    const t = GetAllSalesQuerySchema.parse({ isCreditSale: "true" });
    expect(t.isCreditSale).toBe(true);
    const f = GetAllSalesQuerySchema.parse({ isCreditSale: "false" });
    expect(f.isCreditSale).toBe(false);
  });

  it("coerces page and limit to numbers", () => {
    const result = GetAllSalesQuerySchema.parse({
      page: "2",
      limit: "25",
    });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(25);
  });
});

describe("GetSalesSummaryQuerySchema", () => {
  it("accepts empty query with defaults", () => {
    const result = GetSalesSummaryQuerySchema.parse({});
    expect(result.locationId).toBeUndefined();
    expect(result.startDate).toBeUndefined();
    expect(result.endDate).toBeUndefined();
  });

  it("accepts locationId, startDate, endDate", () => {
    const result = GetSalesSummaryQuerySchema.parse({
      locationId: "550e8400-e29b-41d4-a716-446655440000",
      startDate: "2025-01-01",
      endDate: "2025-01-31",
    });
    expect(result.locationId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.startDate).toBe("2025-01-01");
    expect(result.endDate).toBe("2025-01-31");
  });
});

describe("GetSalesByLocationQuerySchema", () => {
  it("accepts startDate and endDate", () => {
    const result = GetSalesByLocationQuerySchema.parse({
      startDate: "2025-01-01",
      endDate: "2025-01-31",
    });
    expect(result.startDate).toBe("2025-01-01");
    expect(result.endDate).toBe("2025-01-31");
  });
});

describe("GetDailySalesQuerySchema", () => {
  it("defaults days to 30", () => {
    const result = GetDailySalesQuerySchema.parse({});
    expect(result.days).toBe(30);
  });

  it("accepts locationId and days", () => {
    const result = GetDailySalesQuerySchema.parse({
      locationId: "550e8400-e29b-41d4-a716-446655440000",
      days: 7,
    });
    expect(result.locationId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.days).toBe(7);
  });
});

describe("DownloadSalesQuerySchema", () => {
  it("defaults format to excel", () => {
    const result = DownloadSalesQuerySchema.parse({});
    expect(result.format).toBe("excel");
  });

  it("accepts format and ids", () => {
    const result = DownloadSalesQuerySchema.parse({
      format: "csv",
      ids: "id1,id2,id3",
    });
    expect(result.format).toBe("csv");
    expect(result.ids).toBe("id1,id2,id3");
  });
});
