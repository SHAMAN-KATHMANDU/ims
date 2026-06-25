import { describe, expect, it } from "vitest";
import {
  CompanySchema,
  DealSchema,
  TaskSchema,
  isValidWebsiteUrl,
  meaningfulText,
  trimmedRequired,
} from "./validation";

describe("meaningfulText", () => {
  const schema = meaningfulText({
    requiredMessage: "Name is required",
    invalidMessage: "Please enter a valid deal name",
  });

  it("rejects empty and whitespace-only input as required", () => {
    expect(schema.safeParse("").error?.issues[0]?.message).toBe(
      "Name is required",
    );
    expect(schema.safeParse("   ").error?.issues[0]?.message).toBe(
      "Name is required",
    );
  });

  it("rejects numbers-only and punctuation-only input as invalid", () => {
    expect(schema.safeParse("123").error?.issues[0]?.message).toBe(
      "Please enter a valid deal name",
    );
    expect(schema.safeParse(".").error?.issues[0]?.message).toBe(
      "Please enter a valid deal name",
    );
  });

  it("accepts text containing at least one letter", () => {
    expect(schema.safeParse("Acme Corp").success).toBe(true);
    expect(schema.safeParse("Deal #42").success).toBe(true);
    expect(schema.safeParse("परियोजना").success).toBe(true);
  });
});

describe("trimmedRequired", () => {
  const schema = trimmedRequired({ requiredMessage: "Title is required" });

  it("rejects whitespace-only input", () => {
    expect(schema.safeParse("   ").success).toBe(false);
    expect(schema.safeParse("\t\n").success).toBe(false);
  });

  it("accepts non-empty input, including numeric-only", () => {
    expect(schema.safeParse("Follow up").success).toBe(true);
    expect(schema.safeParse("123").success).toBe(true);
  });
});

describe("isValidWebsiteUrl", () => {
  it("rejects junk TLDs", () => {
    expect(isValidWebsiteUrl("https://acme.cwedfghjk")).toBe(false);
  });

  it("rejects non-http(s) protocols and malformed input", () => {
    expect(isValidWebsiteUrl("ftp://acme.com")).toBe(false);
    expect(isValidWebsiteUrl("acme.com")).toBe(false);
    expect(isValidWebsiteUrl("not a url")).toBe(false);
    expect(isValidWebsiteUrl("https://acme")).toBe(false);
  });

  it("accepts known generic TLDs and country-code TLDs", () => {
    expect(isValidWebsiteUrl("https://acme.com")).toBe(true);
    expect(isValidWebsiteUrl("http://acme.org/path")).toBe(true);
    expect(isValidWebsiteUrl("https://shamanyantra.com.np")).toBe(true);
    expect(isValidWebsiteUrl("https://sub.acme.io")).toBe(true);
  });
});

describe("schema wiring", () => {
  it("DealSchema rejects junk names", () => {
    expect(DealSchema.safeParse({ name: "123", value: 0 }).success).toBe(false);
    expect(
      DealSchema.safeParse({ name: "New website project", value: 100 }).success,
    ).toBe(true);
  });

  it("TaskSchema rejects whitespace-only titles", () => {
    expect(TaskSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(TaskSchema.safeParse({ title: "Call client" }).success).toBe(true);
  });

  it("CompanySchema validates website TLDs", () => {
    expect(
      CompanySchema.safeParse({
        name: "Acme",
        website: "https://acme.cwedfghjk",
      }).success,
    ).toBe(false);
    expect(
      CompanySchema.safeParse({ name: "Acme", website: "https://acme.com" })
        .success,
    ).toBe(true);
    expect(CompanySchema.safeParse({ name: "Acme", website: "" }).success).toBe(
      true,
    );
  });
});
