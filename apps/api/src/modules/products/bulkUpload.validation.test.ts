import { describe, it, expect } from "vitest";
import { excelProductRowSchema } from "./bulkUpload.validation";

const minValid = {
  location: "Store 1",
  category: "Shoes",
  name: "Runner",
  costPrice: 100,
  finalSP: 150,
};

describe("excelProductRowSchema", () => {
  describe("required string fields (location/category/name)", () => {
    it("accepts minimum valid row", () => {
      const parsed = excelProductRowSchema.parse(minValid);
      expect(parsed.location).toBe("Store 1");
      expect(parsed.category).toBe("Shoes");
      expect(parsed.name).toBe("Runner");
    });

    it("trims whitespace on required strings", () => {
      const parsed = excelProductRowSchema.parse({
        ...minValid,
        location: "  Store 1  ",
        name: "  Runner  ",
      });
      expect(parsed.location).toBe("Store 1");
      expect(parsed.name).toBe("Runner");
    });

    it("rejects empty-string location", () => {
      expect(() =>
        excelProductRowSchema.parse({ ...minValid, location: "" }),
      ).toThrow();
    });

    it("rejects '-' sentinel in required field", () => {
      expect(() =>
        excelProductRowSchema.parse({ ...minValid, category: "-" }),
      ).toThrow();
    });

    it("rejects missing name", () => {
      const { name: _n, ...rest } = minValid;
      expect(() => excelProductRowSchema.parse(rest)).toThrow();
    });

    it("coerces numeric values to string for required fields", () => {
      const parsed = excelProductRowSchema.parse({
        ...minValid,
        location: 42 as unknown as string,
      });
      expect(parsed.location).toBe("42");
    });
  });

  describe("optional string fields (imsCode/subCategory/description/vendor)", () => {
    it("normalizes '' and '-' to null", () => {
      const parsed = excelProductRowSchema.parse({
        ...minValid,
        imsCode: "",
        subCategory: "-",
        description: "",
        vendor: "-",
      });
      expect(parsed.imsCode).toBeNull();
      expect(parsed.subCategory).toBeNull();
      expect(parsed.description).toBeNull();
      expect(parsed.vendor).toBeNull();
    });

    it("defaults to null when omitted", () => {
      const parsed = excelProductRowSchema.parse(minValid);
      expect(parsed.imsCode).toBeNull();
      expect(parsed.subCategory).toBeNull();
      expect(parsed.description).toBeNull();
      expect(parsed.vendor).toBeNull();
    });

    it("preserves non-empty trimmed strings", () => {
      const parsed = excelProductRowSchema.parse({
        ...minValid,
        imsCode: "  SKU-001  ",
        description: "  hello  ",
      });
      expect(parsed.imsCode).toBe("SKU-001");
      expect(parsed.description).toBe("hello");
    });
  });

  describe("optional numeric dimensions (length/breadth/height/weight)", () => {
    it("parses numeric-string values", () => {
      const parsed = excelProductRowSchema.parse({
        ...minValid,
        length: "10.5",
        breadth: "5",
        height: "3",
        weight: "0.75",
      });
      expect(parsed.length).toBe(10.5);
      expect(parsed.breadth).toBe(5);
      expect(parsed.height).toBe(3);
      expect(parsed.weight).toBe(0.75);
    });

    it("passes through number values as-is", () => {
      const parsed = excelProductRowSchema.parse({
        ...minValid,
        length: 12.34,
      });
      expect(parsed.length).toBe(12.34);
    });

    it("returns null for unparseable strings", () => {
      const parsed = excelProductRowSchema.parse({
        ...minValid,
        length: "not-a-number",
      });
      expect(parsed.length).toBeNull();
    });

    it("defaults to null when omitted", () => {
      const parsed = excelProductRowSchema.parse(minValid);
      expect(parsed.length).toBeNull();
      expect(parsed.breadth).toBeNull();
      expect(parsed.height).toBeNull();
      expect(parsed.weight).toBeNull();
    });
  });

  describe("quantity", () => {
    it("defaults to 0 when omitted", () => {
      const parsed = excelProductRowSchema.parse(minValid);
      expect(parsed.quantity).toBe(0);
    });

    it("defaults to 0 for unparseable strings", () => {
      const parsed = excelProductRowSchema.parse({
        ...minValid,
        quantity: "abc",
      });
      expect(parsed.quantity).toBe(0);
    });

    it("floors fractional numbers", () => {
      const parsed = excelProductRowSchema.parse({
        ...minValid,
        quantity: 5.9,
      });
      expect(parsed.quantity).toBe(5);
    });

    it("floors fractional numeric strings", () => {
      const parsed = excelProductRowSchema.parse({
        ...minValid,
        quantity: "7.8",
      });
      expect(parsed.quantity).toBe(7);
    });
  });

  describe("costPrice / finalSP (required numerics)", () => {
    it("parses numeric-string values", () => {
      const parsed = excelProductRowSchema.parse({
        ...minValid,
        costPrice: "99.5",
        finalSP: "149.99",
      });
      expect(parsed.costPrice).toBe(99.5);
      expect(parsed.finalSP).toBe(149.99);
    });

    it("accepts zero (refine is >= 0)", () => {
      const parsed = excelProductRowSchema.parse({
        ...minValid,
        costPrice: 0,
        finalSP: 0,
      });
      expect(parsed.costPrice).toBe(0);
      expect(parsed.finalSP).toBe(0);
    });

    it("rejects negative costPrice", () => {
      expect(() =>
        excelProductRowSchema.parse({ ...minValid, costPrice: -1 }),
      ).toThrow();
    });

    it("rejects negative finalSP", () => {
      expect(() =>
        excelProductRowSchema.parse({ ...minValid, finalSP: -0.01 }),
      ).toThrow();
    });

    it("throws on unparseable costPrice", () => {
      expect(() =>
        excelProductRowSchema.parse({ ...minValid, costPrice: "abc" }),
      ).toThrow();
    });

    it("rejects missing finalSP", () => {
      const { finalSP: _f, ...rest } = minValid;
      expect(() => excelProductRowSchema.parse(rest)).toThrow();
    });
  });

  describe("dynamicAttributes", () => {
    it("defaults to empty object when omitted", () => {
      const parsed = excelProductRowSchema.parse(minValid);
      expect(parsed.dynamicAttributes).toEqual({});
    });

    it("preserves provided attribute map", () => {
      const parsed = excelProductRowSchema.parse({
        ...minValid,
        dynamicAttributes: { Color: "Red", Size: "L" },
      });
      expect(parsed.dynamicAttributes).toEqual({ Color: "Red", Size: "L" });
    });

    it("rejects non-string attribute values", () => {
      expect(() =>
        excelProductRowSchema.parse({
          ...minValid,
          dynamicAttributes: { Size: 42 as unknown as string },
        }),
      ).toThrow();
    });
  });
});
