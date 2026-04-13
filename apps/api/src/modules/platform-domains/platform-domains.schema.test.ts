import { describe, it, expect } from "vitest";
import {
  CreateTenantDomainSchema,
  UpdateTenantDomainSchema,
  ListTenantDomainsQuerySchema,
} from "./platform-domains.schema";

describe("CreateTenantDomainSchema", () => {
  it("accepts a valid www hostname", () => {
    const result = CreateTenantDomainSchema.parse({
      hostname: "www.acme.com",
      appType: "WEBSITE",
    });
    expect(result.hostname).toBe("www.acme.com");
    expect(result.appType).toBe("WEBSITE");
    expect(result.isPrimary).toBe(false);
  });

  it("lowercases the hostname", () => {
    const result = CreateTenantDomainSchema.parse({
      hostname: "IMS.Acme.COM",
      appType: "IMS",
    });
    expect(result.hostname).toBe("ims.acme.com");
  });

  it("accepts isPrimary=true", () => {
    const result = CreateTenantDomainSchema.parse({
      hostname: "acme.com",
      appType: "WEBSITE",
      isPrimary: true,
    });
    expect(result.isPrimary).toBe(true);
  });

  it("rejects hostname without TLD", () => {
    expect(() =>
      CreateTenantDomainSchema.parse({
        hostname: "localhost",
        appType: "WEBSITE",
      }),
    ).toThrow();
  });

  it("rejects hostname with spaces", () => {
    expect(() =>
      CreateTenantDomainSchema.parse({
        hostname: "www acme.com",
        appType: "WEBSITE",
      }),
    ).toThrow();
  });

  it("rejects hostname with scheme", () => {
    expect(() =>
      CreateTenantDomainSchema.parse({
        hostname: "https://acme.com",
        appType: "WEBSITE",
      }),
    ).toThrow();
  });

  it("rejects hostname with trailing dot label", () => {
    expect(() =>
      CreateTenantDomainSchema.parse({
        hostname: "acme.",
        appType: "WEBSITE",
      }),
    ).toThrow();
  });

  it("rejects invalid appType", () => {
    expect(() =>
      CreateTenantDomainSchema.parse({
        hostname: "acme.com",
        appType: "FOO",
      }),
    ).toThrow();
  });
});

describe("UpdateTenantDomainSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = UpdateTenantDomainSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts partial update with appType", () => {
    const result = UpdateTenantDomainSchema.parse({ appType: "IMS" });
    expect(result.appType).toBe("IMS");
    expect(result.isPrimary).toBeUndefined();
  });

  it("accepts partial update with isPrimary", () => {
    const result = UpdateTenantDomainSchema.parse({ isPrimary: true });
    expect(result.isPrimary).toBe(true);
  });

  it("rejects invalid appType", () => {
    expect(() =>
      UpdateTenantDomainSchema.parse({ appType: "INVALID" }),
    ).toThrow();
  });
});

describe("ListTenantDomainsQuerySchema", () => {
  it("accepts empty query", () => {
    expect(ListTenantDomainsQuerySchema.parse({})).toEqual({});
  });

  it("accepts appType filter", () => {
    expect(ListTenantDomainsQuerySchema.parse({ appType: "WEBSITE" })).toEqual({
      appType: "WEBSITE",
    });
  });
});
