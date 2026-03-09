import { describe, it, expect } from "vitest";
import {
  CreateLocationSchema,
  UpdateLocationSchema,
  LOCATION_TYPE,
} from "./location.schema";

describe("CreateLocationSchema", () => {
  it("accepts valid name only", () => {
    const result = CreateLocationSchema.parse({ name: "Main Warehouse" });
    expect(result.name).toBe("Main Warehouse");
    expect(result.type).toBe("SHOWROOM");
    expect(result.address).toBeUndefined();
    expect(result.isDefaultWarehouse).toBeUndefined();
  });

  it("accepts all fields", () => {
    const result = CreateLocationSchema.parse({
      name: "Main Warehouse",
      type: "WAREHOUSE",
      address: "123 Industrial Area",
      isDefaultWarehouse: true,
    });
    expect(result).toEqual({
      name: "Main Warehouse",
      type: "WAREHOUSE",
      address: "123 Industrial Area",
      isDefaultWarehouse: true,
    });
  });

  it("defaults type to SHOWROOM when not provided", () => {
    const result = CreateLocationSchema.parse({ name: "Store 1" });
    expect(result.type).toBe("SHOWROOM");
  });

  it("rejects empty name", () => {
    expect(() => CreateLocationSchema.parse({ name: "" })).toThrow();
  });

  it("rejects missing name", () => {
    expect(() => CreateLocationSchema.parse({})).toThrow();
  });

  it("rejects invalid type", () => {
    expect(() =>
      CreateLocationSchema.parse({
        name: "Store",
        type: "INVALID",
      }),
    ).toThrow();
  });

  it("accepts both valid types", () => {
    expect(
      CreateLocationSchema.parse({ name: "W1", type: "WAREHOUSE" }).type,
    ).toBe("WAREHOUSE");
    expect(
      CreateLocationSchema.parse({ name: "S1", type: "SHOWROOM" }).type,
    ).toBe("SHOWROOM");
  });
});

describe("UpdateLocationSchema", () => {
  it("accepts empty object (no-op update)", () => {
    const result = UpdateLocationSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts partial update with only name", () => {
    const result = UpdateLocationSchema.parse({ name: "New Name" });
    expect(result.name).toBe("New Name");
  });

  it("accepts null address to clear it", () => {
    const result = UpdateLocationSchema.parse({ address: null });
    expect(result.address).toBeNull();
  });

  it("accepts isActive boolean", () => {
    const result = UpdateLocationSchema.parse({ isActive: false });
    expect(result.isActive).toBe(false);
  });

  it("rejects empty string name", () => {
    expect(() => UpdateLocationSchema.parse({ name: "" })).toThrow();
  });

  it("rejects invalid type", () => {
    expect(() => UpdateLocationSchema.parse({ type: "INVALID" })).toThrow();
  });
});

describe("LOCATION_TYPE", () => {
  it("contains WAREHOUSE and SHOWROOM", () => {
    expect(LOCATION_TYPE).toContain("WAREHOUSE");
    expect(LOCATION_TYPE).toContain("SHOWROOM");
    expect(LOCATION_TYPE).toHaveLength(2);
  });
});
