import { describe, it, expect } from "vitest";
import {
  bulkDownloadQuerySchema,
  bulkTemplateQuerySchema,
  bulkUploadParamsSchema,
} from "./bulk.schema";

describe("bulk schemas", () => {
  it("validates upload params schema", () => {
    const parsed = bulkUploadParamsSchema.parse({ type: "products" });
    expect(parsed.type).toBe("products");
  });

  it("validates template query schema", () => {
    const parsed = bulkTemplateQuerySchema.parse({ type: "members" });
    expect(parsed.type).toBe("members");
  });

  it("validates download query schema", () => {
    const parsed = bulkDownloadQuerySchema.parse({
      type: "sales",
      format: "CSV",
      ids: " a,b,c ",
    });
    expect(parsed.type).toBe("sales");
    expect(parsed.format).toBe("csv");
    expect(parsed.ids).toBe("a,b,c");
  });

  it("rejects invalid type", () => {
    const result = bulkTemplateQuerySchema.safeParse({ type: "foo" });
    expect(result.success).toBe(false);
  });
});
