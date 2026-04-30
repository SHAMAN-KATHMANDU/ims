import { describe, it, expect } from "vitest";
import { CreateRedirectSchema, UpdateRedirectSchema } from "./redirects.schema";

describe("CreateRedirectSchema", () => {
  it("accepts valid 301 redirect", () => {
    const result = CreateRedirectSchema.parse({
      fromPath: "/old-page",
      toPath: "/new-page",
      statusCode: 301,
    });
    expect(result.fromPath).toBe("/old-page");
    expect(result.toPath).toBe("/new-page");
    expect(result.statusCode).toBe(301);
    expect(result.isActive).toBe(true);
  });

  it("accepts valid 302 redirect", () => {
    const result = CreateRedirectSchema.parse({
      fromPath: "/promo",
      toPath: "/products",
      statusCode: 302,
      isActive: false,
    });
    expect(result.statusCode).toBe(302);
    expect(result.isActive).toBe(false);
  });

  it("defaults statusCode to 301 and isActive to true", () => {
    const result = CreateRedirectSchema.parse({
      fromPath: "/a",
      toPath: "/b",
    });
    expect(result.statusCode).toBe(301);
    expect(result.isActive).toBe(true);
  });

  it("rejects path not starting with /", () => {
    expect(() =>
      CreateRedirectSchema.parse({ fromPath: "no-slash", toPath: "/b" }),
    ).toThrow();
  });

  it("rejects empty fromPath", () => {
    expect(() =>
      CreateRedirectSchema.parse({ fromPath: "", toPath: "/b" }),
    ).toThrow();
  });

  it("rejects statusCode other than 301 or 302", () => {
    expect(() =>
      CreateRedirectSchema.parse({
        fromPath: "/a",
        toPath: "/b",
        statusCode: 200,
      }),
    ).toThrow();
  });

  it("rejects identical fromPath and toPath", () => {
    expect(() =>
      CreateRedirectSchema.parse({
        fromPath: "/same",
        toPath: "/same",
      }),
    ).toThrow("fromPath and toPath must differ");
  });

  it("rejects path longer than 500 chars", () => {
    const long = "/" + "a".repeat(500);
    expect(() =>
      CreateRedirectSchema.parse({ fromPath: long, toPath: "/b" }),
    ).toThrow();
  });

  it("trims whitespace from paths", () => {
    const result = CreateRedirectSchema.parse({
      fromPath: "  /old  ",
      toPath: "  /new  ",
    });
    expect(result.fromPath).toBe("/old");
    expect(result.toPath).toBe("/new");
  });
});

describe("UpdateRedirectSchema", () => {
  it("accepts partial update with isActive only", () => {
    const result = UpdateRedirectSchema.parse({ isActive: false });
    expect(result.isActive).toBe(false);
    expect(result.fromPath).toBeUndefined();
  });

  it("accepts empty update object", () => {
    const result = UpdateRedirectSchema.parse({});
    expect(result).toEqual({});
  });

  it("rejects identical fromPath and toPath when both provided", () => {
    expect(() =>
      UpdateRedirectSchema.parse({ fromPath: "/loop", toPath: "/loop" }),
    ).toThrow("fromPath and toPath must differ");
  });

  it("allows updating only toPath", () => {
    const result = UpdateRedirectSchema.parse({ toPath: "/new-target" });
    expect(result.toPath).toBe("/new-target");
  });

  it("allows updating statusCode", () => {
    const result = UpdateRedirectSchema.parse({ statusCode: 302 });
    expect(result.statusCode).toBe(302);
  });
});
