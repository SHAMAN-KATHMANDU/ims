import { describe, it, expect } from "vitest";
import {
  createVendorSchema,
  updateVendorSchema,
  vendorIdParamsSchema,
  vendorListQuerySchema,
  vendorProductsQuerySchema,
} from "./vendor.schema";

describe("vendor schemas", () => {
  it("validates createVendorSchema and trims values", () => {
    const parsed = createVendorSchema.parse({
      name: "  Acme Suppliers ",
      contact: "  Jane Doe ",
      phone: " 9800000000 ",
      address: "  Kathmandu ",
    });

    expect(parsed.name).toBe("Acme Suppliers");
    expect(parsed.contact).toBe("Jane Doe");
    expect(parsed.phone).toBe("9800000000");
    expect(parsed.address).toBe("Kathmandu");
  });

  it("rejects empty vendor name", () => {
    const result = createVendorSchema.safeParse({
      name: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("validates updateVendorSchema partial payload", () => {
    const parsed = updateVendorSchema.parse({
      name: "  Updated Vendor ",
      contact: null,
    });

    expect(parsed.name).toBe("Updated Vendor");
    expect(parsed.contact).toBeNull();
  });

  it("validates vendorIdParamsSchema", () => {
    const parsed = vendorIdParamsSchema.parse({ id: "vendor-1" });
    expect(parsed.id).toBe("vendor-1");
  });

  it("validates vendorListQuerySchema", () => {
    const parsed = vendorListQuerySchema.parse({
      page: "1",
      limit: "25",
      search: "  acme ",
      sortBy: "name",
      sortOrder: "asc",
    });

    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(25);
    expect(parsed.search).toBe("acme");
    expect(parsed.sortBy).toBe("name");
    expect(parsed.sortOrder).toBe("asc");
  });

  it("validates vendorProductsQuerySchema", () => {
    const parsed = vendorProductsQuerySchema.parse({
      page: "2",
      limit: "10",
      search: "  item ",
    });

    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(10);
    expect(parsed.search).toBe("item");
  });
});
