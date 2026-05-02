import { describe, it, expect } from "vitest";
import { CreatePublicApiKeySchema } from "./public-api-keys.schema";

describe("CreatePublicApiKeySchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts a minimal valid payload", () => {
    const result = CreatePublicApiKeySchema.safeParse({
      name: "Acme production",
      tenantDomainId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("trims whitespace on name", () => {
    const result = CreatePublicApiKeySchema.parse({
      name: "  Acme  ",
      tenantDomainId: validUuid,
    });
    expect(result.name).toBe("Acme");
  });

  it("rejects empty name", () => {
    const result = CreatePublicApiKeySchema.safeParse({
      name: "",
      tenantDomainId: validUuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only name after trim", () => {
    const result = CreatePublicApiKeySchema.safeParse({
      name: "   ",
      tenantDomainId: validUuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 chars", () => {
    const result = CreatePublicApiKeySchema.safeParse({
      name: "a".repeat(101),
      tenantDomainId: validUuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid tenantDomainId", () => {
    const result = CreatePublicApiKeySchema.safeParse({
      name: "Acme",
      tenantDomainId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional rateLimitPerMin", () => {
    const result = CreatePublicApiKeySchema.parse({
      name: "Acme",
      tenantDomainId: validUuid,
      rateLimitPerMin: 60,
    });
    expect(result.rateLimitPerMin).toBe(60);
  });

  it("rejects rateLimitPerMin below 1", () => {
    const result = CreatePublicApiKeySchema.safeParse({
      name: "Acme",
      tenantDomainId: validUuid,
      rateLimitPerMin: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects rateLimitPerMin above 10000", () => {
    const result = CreatePublicApiKeySchema.safeParse({
      name: "Acme",
      tenantDomainId: validUuid,
      rateLimitPerMin: 10_001,
    });
    expect(result.success).toBe(false);
  });
});
