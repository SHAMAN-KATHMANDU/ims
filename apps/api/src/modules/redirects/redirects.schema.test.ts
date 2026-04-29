import { describe, it, expect } from "vitest";
import {
  CreateRedirectSchema,
  UpdateRedirectSchema,
} from "./redirects.schema";

describe("CreateRedirectSchema", () => {
  it("accepts valid create input", () => {
    const input = {
      fromPath: "/old-page",
      toPath: "/new-page",
      statusCode: 301,
      isActive: true,
    };
    const result = CreateRedirectSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("defaults isActive to true", () => {
    const input = {
      fromPath: "/old",
      toPath: "/new",
      statusCode: 301,
    };
    const result = CreateRedirectSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });

  it("rejects path without leading slash", () => {
    const input = {
      fromPath: "old-page",
      toPath: "/new-page",
      statusCode: 301,
    };
    const result = CreateRedirectSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid status code", () => {
    const input = {
      fromPath: "/old",
      toPath: "/new",
      statusCode: 404,
    };
    const result = CreateRedirectSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects path over 500 chars", () => {
    const input = {
      fromPath: "/" + "a".repeat(501),
      toPath: "/new",
      statusCode: 301,
    };
    const result = CreateRedirectSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("trims whitespace from paths", () => {
    const input = {
      fromPath: "  /old  ",
      toPath: "  /new  ",
      statusCode: 302,
    };
    const result = CreateRedirectSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fromPath).toBe("/old");
      expect(result.data.toPath).toBe("/new");
    }
  });
});

describe("UpdateRedirectSchema", () => {
  it("accepts partial update with fromPath only", () => {
    const input = { fromPath: "/new-old" };
    const result = UpdateRedirectSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts partial update with toPath only", () => {
    const input = { toPath: "/new-destination" };
    const result = UpdateRedirectSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts isActive toggle", () => {
    const input = { isActive: false };
    const result = UpdateRedirectSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no-op update)", () => {
    const input = {};
    const result = UpdateRedirectSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects invalid status code", () => {
    const input = { statusCode: 307 };
    const result = UpdateRedirectSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
