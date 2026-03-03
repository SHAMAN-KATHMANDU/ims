import { describe, it, expect } from "vitest";
import {
  AnalyticsQuerySchema,
  ExportAnalyticsQuerySchema,
} from "./analytics.schema";

describe("AnalyticsQuerySchema", () => {
  it("accepts valid query params", () => {
    const result = AnalyticsQuerySchema.parse({
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
      locationIds: "loc1,loc2",
      saleType: "GENERAL",
      creditStatus: "credit",
      userId: "u1",
      categoryId: "cat1",
      vendorId: "v1",
    });
    expect(result.dateFrom).toBe("2024-01-01");
    expect(result.dateTo).toBe("2024-12-31");
    expect(result.locationIds).toEqual(["loc1", "loc2"]);
    expect(result.saleType).toBe("GENERAL");
    expect(result.creditStatus).toBe("credit");
    expect(result.userId).toBe("u1");
    expect(result.categoryId).toBe("cat1");
    expect(result.vendorId).toBe("v1");
  });

  it("accepts empty object", () => {
    const result = AnalyticsQuerySchema.parse({});
    expect(result.dateFrom).toBeUndefined();
    expect(result.dateTo).toBeUndefined();
    expect(result.locationIds).toBeUndefined();
  });

  it("parses locationIds from comma-separated string", () => {
    const result = AnalyticsQuerySchema.parse({
      locationIds: "a, b, c",
    });
    expect(result.locationIds).toEqual(["a", "b", "c"]);
  });

  it("accepts saleType GENERAL and MEMBER", () => {
    expect(AnalyticsQuerySchema.parse({ saleType: "GENERAL" }).saleType).toBe(
      "GENERAL",
    );
    expect(AnalyticsQuerySchema.parse({ saleType: "MEMBER" }).saleType).toBe(
      "MEMBER",
    );
  });

  it("accepts creditStatus credit and non-credit", () => {
    expect(
      AnalyticsQuerySchema.parse({ creditStatus: "credit" }).creditStatus,
    ).toBe("credit");
    expect(
      AnalyticsQuerySchema.parse({ creditStatus: "non-credit" }).creditStatus,
    ).toBe("non-credit");
  });
});

describe("ExportAnalyticsQuerySchema", () => {
  it("extends AnalyticsQuerySchema with type and format", () => {
    const result = ExportAnalyticsQuerySchema.parse({
      type: "sales-revenue",
      format: "excel",
    });
    expect(result.type).toBe("sales-revenue");
    expect(result.format).toBe("excel");
  });

  it("accepts format csv and excel", () => {
    expect(ExportAnalyticsQuerySchema.parse({ format: "csv" }).format).toBe(
      "csv",
    );
    expect(ExportAnalyticsQuerySchema.parse({ format: "excel" }).format).toBe(
      "excel",
    );
  });
});
