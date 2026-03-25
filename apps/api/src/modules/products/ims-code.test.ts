import { describe, it, expect } from "vitest";
import {
  escapeRegex,
  firstImsCodeLetter,
  sanitizeSlugForImsCode,
  buildImsCodePrefix,
  maxNumericSuffixForPrefix,
  isProductImsCodeTenantUniqueViolation,
} from "./ims-code";

describe("ims-code", () => {
  describe("escapeRegex", () => {
    it("escapes metacharacters", () => {
      expect(escapeRegex("a.b")).toBe("a\\.b");
      expect(escapeRegex("x[1]")).toBe("x\\[1\\]");
    });
  });

  describe("firstImsCodeLetter", () => {
    it("returns first alnum uppercased", () => {
      expect(firstImsCodeLetter("Electronics")).toBe("E");
      expect(firstImsCodeLetter("shirts")).toBe("S");
      expect(firstImsCodeLetter("9mm")).toBe("9");
    });

    it("skips leading non-alnum", () => {
      expect(firstImsCodeLetter("  (Foo)")).toBe("F");
    });

    it("returns X when none", () => {
      expect(firstImsCodeLetter("")).toBe("X");
      expect(firstImsCodeLetter("   ")).toBe("X");
      expect(firstImsCodeLetter("@@@")).toBe("X");
    });
  });

  describe("sanitizeSlugForImsCode", () => {
    it("keeps alnum lowercased", () => {
      expect(sanitizeSlugForImsCode("Acme-Corp")).toBe("acmecorp");
      expect(sanitizeSlugForImsCode("demo")).toBe("demo");
    });

    it("falls back to tenant when empty", () => {
      expect(sanitizeSlugForImsCode("")).toBe("tenant");
      expect(sanitizeSlugForImsCode("---")).toBe("tenant");
    });
  });

  describe("buildImsCodePrefix", () => {
    it("builds slug-category without subcategory", () => {
      expect(buildImsCodePrefix("demo", "Products", null)).toBe("demo-P");
      expect(buildImsCodePrefix("demo", "Products", undefined)).toBe("demo-P");
      expect(buildImsCodePrefix("demo", "Products", "   ")).toBe("demo-P");
    });

    it("appends subcategory letter when present", () => {
      expect(buildImsCodePrefix("demo", "Products", "Shirts")).toBe("demo-PS");
    });
  });

  describe("maxNumericSuffixForPrefix", () => {
    it("returns 0 when no match", () => {
      expect(maxNumericSuffixForPrefix([], "demo-P")).toBe(0);
      expect(
        maxNumericSuffixForPrefix(["demo-Px1", "uuid-here"], "demo-P"),
      ).toBe(0);
    });

    it("returns max trailing digits for exact prefix pattern", () => {
      expect(
        maxNumericSuffixForPrefix(["demo-P1", "demo-P10", "demo-P2"], "demo-P"),
      ).toBe(10);
    });

    it("does not treat longer prefix codes as shorter prefix", () => {
      expect(
        maxNumericSuffixForPrefix(["demo-Ps1", "demo-Ps2"], "demo-P"),
      ).toBe(0);
    });
  });

  describe("isProductImsCodeTenantUniqueViolation", () => {
    it("returns true for P2002 on tenant and ims", () => {
      expect(
        isProductImsCodeTenantUniqueViolation({
          code: "P2002",
          meta: { target: ["tenant_id", "ims_code"] },
        }),
      ).toBe(true);
    });

    it("returns false for other errors", () => {
      expect(isProductImsCodeTenantUniqueViolation({ code: "P2025" })).toBe(
        false,
      );
    });
  });
});
