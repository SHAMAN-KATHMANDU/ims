import { describe, it, expect } from "vitest";
import { CreateVendorSchema, UpdateVendorSchema } from "./vendor.schema";

describe("CreateVendorSchema", () => {
  it("accepts valid name only", () => {
    const result = CreateVendorSchema.parse({ name: "Acme Supplies" });
    expect(result.name).toBe("Acme Supplies");
    expect(result.contact).toBeUndefined();
    expect(result.phone).toBeUndefined();
    expect(result.address).toBeUndefined();
  });

  it("accepts all fields", () => {
    const result = CreateVendorSchema.parse({
      name: "Acme Supplies",
      contact: "John Doe",
      phone: "+1234567890",
      address: "123 Main St",
    });
    expect(result).toEqual({
      name: "Acme Supplies",
      contact: "John Doe",
      phone: "+1234567890",
      address: "123 Main St",
    });
  });

  it("rejects empty name", () => {
    expect(() => CreateVendorSchema.parse({ name: "" })).toThrow();
  });

  it("rejects missing name", () => {
    expect(() => CreateVendorSchema.parse({})).toThrow();
  });

  it("rejects name exceeding 200 characters", () => {
    expect(() => CreateVendorSchema.parse({ name: "a".repeat(201) })).toThrow();
  });

  it("rejects phone exceeding 50 characters", () => {
    expect(() =>
      CreateVendorSchema.parse({ name: "Acme", phone: "1".repeat(51) }),
    ).toThrow();
  });
});

describe("UpdateVendorSchema", () => {
  it("accepts empty object (no-op update)", () => {
    const result = UpdateVendorSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts partial update with only name", () => {
    const result = UpdateVendorSchema.parse({ name: "New Name" });
    expect(result.name).toBe("New Name");
  });

  it("accepts null contact to clear it", () => {
    const result = UpdateVendorSchema.parse({ contact: null });
    expect(result.contact).toBeNull();
  });

  it("accepts null phone to clear it", () => {
    const result = UpdateVendorSchema.parse({ phone: null });
    expect(result.phone).toBeNull();
  });

  it("accepts null address to clear it", () => {
    const result = UpdateVendorSchema.parse({ address: null });
    expect(result.address).toBeNull();
  });

  it("rejects empty string name", () => {
    expect(() => UpdateVendorSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name exceeding 200 characters", () => {
    expect(() => UpdateVendorSchema.parse({ name: "a".repeat(201) })).toThrow();
  });
});
