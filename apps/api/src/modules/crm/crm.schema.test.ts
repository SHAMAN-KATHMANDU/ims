import { describe, it, expect } from "vitest";
import { crmReportsQuerySchema } from "./crm.schema";

describe("crm schemas", () => {
  it("validates crmReportsQuerySchema with year", () => {
    const parsed = crmReportsQuerySchema.parse({ year: "2026" });
    expect(parsed.year).toBe(2026);
  });

  it("allows missing year", () => {
    const parsed = crmReportsQuerySchema.parse({});
    expect(parsed.year).toBeUndefined();
  });

  it("rejects invalid year", () => {
    const result = crmReportsQuerySchema.safeParse({ year: "nope" });
    expect(result.success).toBe(false);
  });
});
