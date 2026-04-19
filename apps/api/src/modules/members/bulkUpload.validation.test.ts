import { describe, it, expect } from "vitest";
import { excelMemberRowSchema } from "./bulkUpload.validation";

describe("excelMemberRowSchema", () => {
  describe("phone (required)", () => {
    it("accepts a plain string phone", () => {
      const parsed = excelMemberRowSchema.parse({ phone: "9800000001" });
      expect(parsed.phone).toBe("9800000001");
    });

    it("strips spaces and hyphens from phone", () => {
      const parsed = excelMemberRowSchema.parse({ phone: "980-000 0001" });
      expect(parsed.phone).toBe("9800000001");
    });

    it("coerces numeric phone to string", () => {
      const parsed = excelMemberRowSchema.parse({ phone: 9800000001 });
      expect(parsed.phone).toBe("9800000001");
    });

    it("rejects phone that normalizes to empty (refine enforces length > 0)", () => {
      // transform strips all spaces+hyphens → "" → refine((v) => v.length > 0) rejects
      expect(() => excelMemberRowSchema.parse({ phone: "  - - " })).toThrow();
    });

    it("rejects missing phone", () => {
      expect(() => excelMemberRowSchema.parse({})).toThrow();
    });
  });

  describe("optional string fields (sn/name/address/notes)", () => {
    it("normalizes empty string to null", () => {
      const parsed = excelMemberRowSchema.parse({
        phone: "123",
        sn: "",
        name: "",
        address: "",
        notes: "",
      });
      expect(parsed.sn).toBeNull();
      expect(parsed.name).toBeNull();
      expect(parsed.address).toBeNull();
      expect(parsed.notes).toBeNull();
    });

    it("normalizes '-' sentinel to null", () => {
      const parsed = excelMemberRowSchema.parse({
        phone: "123",
        name: "-",
        notes: "-",
      });
      expect(parsed.name).toBeNull();
      expect(parsed.notes).toBeNull();
    });

    it("trims whitespace around values", () => {
      const parsed = excelMemberRowSchema.parse({
        phone: "123",
        name: "  Alice  ",
      });
      expect(parsed.name).toBe("Alice");
    });

    it("coerces numeric sn to string", () => {
      const parsed = excelMemberRowSchema.parse({ phone: "123", sn: 42 });
      expect(parsed.sn).toBe("42");
    });
  });

  describe("id (UUID) field", () => {
    it("accepts a valid v4 UUID", () => {
      const parsed = excelMemberRowSchema.parse({
        phone: "123",
        id: "11111111-1111-4111-8111-111111111111",
      });
      expect(parsed.id).toBe("11111111-1111-4111-8111-111111111111");
    });

    it("normalizes blank id to null and passes", () => {
      const parsed = excelMemberRowSchema.parse({ phone: "123", id: "" });
      expect(parsed.id).toBeNull();
    });

    it("rejects a non-UUID id", () => {
      expect(() =>
        excelMemberRowSchema.parse({ phone: "123", id: "not-a-uuid" }),
      ).toThrow();
    });

    it("rejects a v1 UUID (schema only permits v1-v5 variant [89abAB])", () => {
      // Shape-check: version nibble must be 1-5, variant nibble must be 8/9/a/b
      expect(() =>
        excelMemberRowSchema.parse({
          phone: "123",
          id: "11111111-1111-6111-8111-111111111111",
        }),
      ).toThrow();
    });
  });

  describe("date fields (dob, memberSince)", () => {
    it("parses ISO yyyy-mm-dd strings", () => {
      const parsed = excelMemberRowSchema.parse({
        phone: "123",
        dob: "1990-05-15",
      });
      expect(parsed.dob).toBeInstanceOf(Date);
      expect(parsed.dob?.getUTCFullYear()).toBe(1990);
    });

    it("accepts a Date instance", () => {
      const d = new Date("2000-01-01T00:00:00Z");
      const parsed = excelMemberRowSchema.parse({
        phone: "123",
        memberSince: d,
      });
      expect(parsed.memberSince).toEqual(d);
    });

    it("rejects an invalid Date instance (z.date() validates before transform)", () => {
      // z.date() rejects invalid Date objects at the schema level, before parseDateValue runs
      expect(() =>
        excelMemberRowSchema.parse({
          phone: "123",
          dob: new Date("not-a-date"),
        }),
      ).toThrow();
    });

    it("parses Excel serial numbers (days since 1899-12-30)", () => {
      // 1 = 1899-12-31, 2 = 1900-01-01 per Excel's quirky epoch
      const parsed = excelMemberRowSchema.parse({ phone: "123", dob: 1 });
      expect(parsed.dob).toBeInstanceOf(Date);
      expect(parsed.dob?.getFullYear()).toBe(1899);
    });

    it("returns null for empty or dash values", () => {
      const parsed = excelMemberRowSchema.parse({
        phone: "123",
        dob: "",
        memberSince: "-",
      });
      expect(parsed.dob).toBeNull();
      expect(parsed.memberSince).toBeNull();
    });

    it("returns null for unparseable strings", () => {
      const parsed = excelMemberRowSchema.parse({
        phone: "123",
        dob: "not-a-date",
      });
      expect(parsed.dob).toBeNull();
    });

    it("defaults to null when omitted", () => {
      const parsed = excelMemberRowSchema.parse({ phone: "123" });
      expect(parsed.dob).toBeNull();
      expect(parsed.memberSince).toBeNull();
    });
  });
});
