import { describe, it, expect } from "vitest";
import {
  companyListQuerySchema,
  createCompanySchema,
  updateCompanySchema,
} from "./company.schema";

describe("company schemas", () => {
  it("validates createCompanySchema and trims fields", () => {
    const parsed = createCompanySchema.parse({
      name: "  Acme Inc ",
      website: " https://acme.com ",
    });

    expect(parsed.name).toBe("Acme Inc");
    expect(parsed.website).toBe("https://acme.com");
  });

  it("rejects empty company name", () => {
    const result = createCompanySchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("validates updateCompanySchema partial payload", () => {
    const parsed = updateCompanySchema.parse({
      phone: " 9800000000 ",
      address: null,
    });

    expect(parsed.phone).toBe("9800000000");
    expect(parsed.address).toBeNull();
  });

  it("validates companyListQuerySchema", () => {
    const parsed = companyListQuerySchema.parse({
      page: "2",
      limit: "10",
      search: "  acme ",
      sortBy: "name",
      sortOrder: "desc",
    });

    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(10);
    expect(parsed.search).toBe("acme");
    expect(parsed.sortBy).toBe("name");
    expect(parsed.sortOrder).toBe("desc");
  });
});
