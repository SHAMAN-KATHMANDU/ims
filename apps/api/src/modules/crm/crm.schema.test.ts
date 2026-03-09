import { describe, it, expect } from "vitest";
import { CrmReportsQuerySchema } from "./crm.schema";

describe("CrmReportsQuerySchema", () => {
  it("defaults to current year when year is missing", () => {
    const result = CrmReportsQuerySchema.parse({});
    expect(result.year).toBe(new Date().getFullYear());
  });

  it("parses year from query", () => {
    const result = CrmReportsQuerySchema.parse({ year: "2024" });
    expect(result.year).toBe(2024);
  });
});
