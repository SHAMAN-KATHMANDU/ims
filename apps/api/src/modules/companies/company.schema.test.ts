import { describe, it, expect } from "vitest";
import { CreateCompanySchema, UpdateCompanySchema } from "./company.schema";

describe("CreateCompanySchema", () => {
  it("accepts valid name only", () => {
    const result = CreateCompanySchema.parse({ name: "Acme Corp" });
    expect(result.name).toBe("Acme Corp");
    expect(result.website).toBeUndefined();
    expect(result.address).toBeUndefined();
    expect(result.phone).toBeUndefined();
  });

  it("accepts name with optional fields", () => {
    const result = CreateCompanySchema.parse({
      name: "Acme Corp",
      website: "https://acme.com",
      address: "123 Main St",
      phone: "+1234567890",
    });
    expect(result).toEqual({
      name: "Acme Corp",
      website: "https://acme.com",
      address: "123 Main St",
      phone: "+1234567890",
    });
  });

  it("trims name and optional string fields", () => {
    const result = CreateCompanySchema.parse({
      name: "  Acme Corp  ",
      website: "  https://acme.com  ",
    });
    expect(result.name).toBe("Acme Corp");
    expect(result.website).toBe("https://acme.com");
  });

  it("rejects empty name", () => {
    expect(() => CreateCompanySchema.parse({ name: "" })).toThrow();
  });

  it("rejects missing name", () => {
    expect(() => CreateCompanySchema.parse({})).toThrow();
  });

  it("rejects name exceeding 255 characters", () => {
    expect(() =>
      CreateCompanySchema.parse({ name: "a".repeat(256) }),
    ).toThrow();
  });
});

describe("UpdateCompanySchema", () => {
  it("accepts partial update with only name", () => {
    const result = UpdateCompanySchema.parse({ name: "New Name" });
    expect(result.name).toBe("New Name");
  });

  it("accepts partial update with website", () => {
    const result = UpdateCompanySchema.parse({ website: "https://new.com" });
    expect(result.website).toBe("https://new.com");
  });

  it("accepts null to clear optional fields", () => {
    const result = UpdateCompanySchema.parse({ website: null });
    expect(result.website).toBeNull();
  });

  it("accepts empty string to clear optional fields", () => {
    const result = UpdateCompanySchema.parse({ website: "" });
    expect(result.website).toBeNull();
  });

  it("accepts empty object (no-op update)", () => {
    const result = UpdateCompanySchema.parse({});
    expect(result).toEqual({});
  });
});
