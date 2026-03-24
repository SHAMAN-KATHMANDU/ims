import { describe, it, expect } from "vitest";
import {
  initialsFromTenantName,
  buildDefaultImsCode,
  defaultImsCodeCandidates,
} from "./ims-code";

describe("ims-code", () => {
  describe("initialsFromTenantName", () => {
    it("uses first letter of each word for multi-word names", () => {
      expect(initialsFromTenantName("Acme Corp")).toBe("AC");
      expect(initialsFromTenantName("Foo Bar Baz")).toBe("FBB");
    });

    it("uses first two letters for single word", () => {
      expect(initialsFromTenantName("Acme")).toBe("AC");
    });

    it("returns XX for empty", () => {
      expect(initialsFromTenantName("")).toBe("XX");
      expect(initialsFromTenantName("   ")).toBe("XX");
    });

    it("pads single-character token", () => {
      expect(initialsFromTenantName("A")).toBe("AX");
    });
  });

  describe("buildDefaultImsCode", () => {
    it("combines initials and last 3 hex chars of uuid (no hyphens)", () => {
      const id = "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeabcd";
      expect(buildDefaultImsCode("Acme Corp", id, 3)).toBe("ACBCD");
    });
  });

  describe("defaultImsCodeCandidates", () => {
    it("starts with suffix length 3 then lengthens", () => {
      const id = "00000000-0000-4000-8000-00000000abcd";
      const gen = defaultImsCodeCandidates("Hi There", id);
      const first = gen.next().value!;
      const second = gen.next().value!;
      expect(first.endsWith("BCD")).toBe(true);
      expect(second.length).toBeGreaterThan(first.length);
    });
  });
});
