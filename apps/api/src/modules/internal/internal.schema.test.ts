import { describe, it, expect } from "vitest";
import {
  DomainAllowedQuerySchema,
  ResolveHostQuerySchema,
} from "./internal.schema";

describe("DomainAllowedQuerySchema", () => {
  it("accepts a valid hostname", () => {
    const result = DomainAllowedQuerySchema.parse({ domain: "www.acme.com" });
    expect(result.domain).toBe("www.acme.com");
  });

  it("lowercases the hostname", () => {
    const result = DomainAllowedQuerySchema.parse({ domain: "WWW.Acme.COM" });
    expect(result.domain).toBe("www.acme.com");
  });

  it("rejects missing domain", () => {
    expect(() => DomainAllowedQuerySchema.parse({})).toThrow();
  });

  it("rejects hostname without TLD", () => {
    expect(() =>
      DomainAllowedQuerySchema.parse({ domain: "localhost" }),
    ).toThrow();
  });

  it("rejects hostname with spaces", () => {
    expect(() =>
      DomainAllowedQuerySchema.parse({ domain: "www acme.com" }),
    ).toThrow();
  });

  it("rejects scheme prefix", () => {
    expect(() =>
      DomainAllowedQuerySchema.parse({ domain: "https://acme.com" }),
    ).toThrow();
  });
});

describe("ResolveHostQuerySchema", () => {
  it("accepts a valid host", () => {
    const result = ResolveHostQuerySchema.parse({ host: "shop.acme.com" });
    expect(result.host).toBe("shop.acme.com");
  });

  it("rejects missing host", () => {
    expect(() => ResolveHostQuerySchema.parse({})).toThrow();
  });

  it("lowercases the host", () => {
    expect(ResolveHostQuerySchema.parse({ host: "SHOP.ACME.COM" }).host).toBe(
      "shop.acme.com",
    );
  });
});
