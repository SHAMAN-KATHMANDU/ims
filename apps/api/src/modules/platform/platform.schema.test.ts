import { describe, it, expect } from "vitest";
import {
  CreateTenantSchema,
  UpdateTenantSchema,
  ResetTenantUserPasswordSchema,
  ChangePlanSchema,
} from "./platform.schema";

describe("CreateTenantSchema", () => {
  it("accepts valid payload", () => {
    const result = CreateTenantSchema.parse({
      name: "Acme Corp",
      slug: "acme",
      plan: "STARTER",
      adminUsername: "admin",
      adminPassword: "secret123",
    });
    expect(result.name).toBe("Acme Corp");
    expect(result.slug).toBe("acme");
    expect(result.plan).toBe("STARTER");
    expect(result.adminUsername).toBe("admin");
    expect(result.adminPassword).toBe("secret123");
  });

  it("defaults plan to STARTER when omitted", () => {
    const result = CreateTenantSchema.parse({
      name: "Test",
      slug: "test",
      adminUsername: "admin",
      adminPassword: "secret123",
    });
    expect(result.plan).toBe("STARTER");
  });

  it("accepts slug with hyphens", () => {
    const result = CreateTenantSchema.parse({
      name: "My Tenant",
      slug: "my-tenant-123",
      adminUsername: "admin",
      adminPassword: "secret123",
    });
    expect(result.slug).toBe("my-tenant-123");
  });

  it("rejects slug with uppercase", () => {
    expect(() =>
      CreateTenantSchema.parse({
        name: "Test",
        slug: "Acme",
        adminUsername: "admin",
        adminPassword: "secret123",
      }),
    ).toThrow();
  });

  it("rejects slug starting with hyphen", () => {
    expect(() =>
      CreateTenantSchema.parse({
        name: "Test",
        slug: "-acme",
        adminUsername: "admin",
        adminPassword: "secret123",
      }),
    ).toThrow();
  });

  it("rejects when name is missing", () => {
    expect(() =>
      CreateTenantSchema.parse({
        slug: "acme",
        adminUsername: "admin",
        adminPassword: "secret123",
      }),
    ).toThrow();
  });

  it("rejects when adminPassword is too short", () => {
    expect(() =>
      CreateTenantSchema.parse({
        name: "Test",
        slug: "acme",
        adminUsername: "admin",
        adminPassword: "short",
      }),
    ).toThrow();
  });
});

describe("UpdateTenantSchema", () => {
  it("accepts partial payload", () => {
    const result = UpdateTenantSchema.parse({ name: "New Name" });
    expect(result.name).toBe("New Name");
    expect(result.slug).toBeUndefined();
  });

  it("accepts empty object", () => {
    const result = UpdateTenantSchema.parse({});
    expect(result).toEqual({});
  });

  it("transforms customMaxUsers empty string to null", () => {
    const result = UpdateTenantSchema.parse({
      customMaxUsers: "",
    });
    expect(result.customMaxUsers).toBeNull();
  });

  it("accepts valid slug", () => {
    const result = UpdateTenantSchema.parse({ slug: "new-slug" });
    expect(result.slug).toBe("new-slug");
  });
});

describe("ResetTenantUserPasswordSchema", () => {
  it("accepts valid newPassword", () => {
    const result = ResetTenantUserPasswordSchema.parse({
      newPassword: "newsecret123",
    });
    expect(result.newPassword).toBe("newsecret123");
  });

  it("rejects password shorter than 6 characters", () => {
    expect(() =>
      ResetTenantUserPasswordSchema.parse({ newPassword: "abc" }),
    ).toThrow();
  });

  it("rejects when newPassword is missing", () => {
    expect(() => ResetTenantUserPasswordSchema.parse({})).toThrow();
  });
});

describe("ChangePlanSchema", () => {
  it("accepts valid payload", () => {
    const result = ChangePlanSchema.parse({ plan: "PROFESSIONAL" });
    expect(result.plan).toBe("PROFESSIONAL");
    expect(result.expiresAt).toBeUndefined();
  });

  it("accepts expiresAt", () => {
    const result = ChangePlanSchema.parse({
      plan: "ENTERPRISE",
      expiresAt: "2025-12-31T00:00:00Z",
    });
    expect(result.plan).toBe("ENTERPRISE");
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it("rejects invalid plan", () => {
    expect(() => ChangePlanSchema.parse({ plan: "INVALID" })).toThrow();
  });
});
