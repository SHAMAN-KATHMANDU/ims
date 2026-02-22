import { describe, expect, it } from "vitest";
import {
  analyticsExportQuerySchema,
  analyticsQuerySchema,
} from "./analytics.schema";

describe("analytics schemas", () => {
  it("validates analyticsQuerySchema", () => {
    const parsed = analyticsQuerySchema.parse({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      saleType: "GENERAL",
      creditStatus: "credit",
      locationIds: "loc-1,loc-2",
    });

    expect(parsed.dateFrom).toBe("2026-01-01");
    expect(parsed.saleType).toBe("GENERAL");
    expect(parsed.creditStatus).toBe("credit");
    expect(parsed.locationIds).toBe("loc-1,loc-2");
  });

  it("validates analyticsExportQuerySchema", () => {
    const parsed = analyticsExportQuerySchema.parse({
      type: "sales-revenue",
      format: "excel",
      categoryId: "cat-1",
    });

    expect(parsed.type).toBe("sales-revenue");
    expect(parsed.format).toBe("excel");
    expect(parsed.categoryId).toBe("cat-1");
  });

  it("rejects invalid export type", () => {
    const result = analyticsExportQuerySchema.safeParse({
      type: "unknown",
      format: "csv",
    });
    expect(result.success).toBe(false);
  });
});
