import { describe, it, expect } from "vitest";
import {
  createLocationSchema,
  locationIdParamsSchema,
  locationListQuerySchema,
  updateLocationSchema,
} from "./location.schema";

describe("location schemas", () => {
  it("validates createLocationSchema and trims values", () => {
    const parsed = createLocationSchema.parse({
      name: "  Main Warehouse ",
      type: "WAREHOUSE",
      address: "  123 Industrial Area ",
      isDefaultWarehouse: true,
    });

    expect(parsed.name).toBe("Main Warehouse");
    expect(parsed.address).toBe("123 Industrial Area");
    expect(parsed.type).toBe("WAREHOUSE");
    expect(parsed.isDefaultWarehouse).toBe(true);
  });

  it("rejects empty location name", () => {
    const result = createLocationSchema.safeParse({
      name: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("validates updateLocationSchema partial payload", () => {
    const parsed = updateLocationSchema.parse({
      name: "  Showroom A ",
      isActive: false,
      address: null,
    });

    expect(parsed.name).toBe("Showroom A");
    expect(parsed.isActive).toBe(false);
    expect(parsed.address).toBeNull();
  });

  it("validates locationIdParamsSchema", () => {
    const parsed = locationIdParamsSchema.parse({ id: "loc-1" });
    expect(parsed.id).toBe("loc-1");
  });

  it("validates locationListQuerySchema", () => {
    const parsed = locationListQuerySchema.parse({
      type: "SHOWROOM",
      activeOnly: "true",
      status: "active",
      page: "2",
      limit: "20",
    });

    expect(parsed.type).toBe("SHOWROOM");
    expect(parsed.activeOnly).toBe(true);
    expect(parsed.status).toBe("active");
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(20);
  });
});
