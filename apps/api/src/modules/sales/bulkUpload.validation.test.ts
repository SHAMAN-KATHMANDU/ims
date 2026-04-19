import { describe, it, expect } from "vitest";
import { excelSaleRowSchema } from "./bulkUpload.validation";

const minValid = {
  showroom: "Main Store",
  soldBy: "Alice",
  productImsCode: "SKU-001",
  productName: "Runner",
  quantity: 2,
  mrp: 100,
  finalAmount: 180,
};

describe("excelSaleRowSchema", () => {
  describe("required string fields", () => {
    it("accepts minimum valid row", () => {
      const parsed = excelSaleRowSchema.parse(minValid);
      expect(parsed.showroom).toBe("Main Store");
      expect(parsed.soldBy).toBe("Alice");
      expect(parsed.productImsCode).toBe("SKU-001");
      expect(parsed.productName).toBe("Runner");
    });

    it("rejects empty-string showroom", () => {
      expect(() =>
        excelSaleRowSchema.parse({ ...minValid, showroom: "" }),
      ).toThrow();
    });

    it("rejects '-' sentinel in productName", () => {
      expect(() =>
        excelSaleRowSchema.parse({ ...minValid, productName: "-" }),
      ).toThrow();
    });

    it("rejects missing soldBy", () => {
      const { soldBy: _s, ...rest } = minValid;
      expect(() => excelSaleRowSchema.parse(rest)).toThrow();
    });
  });

  describe("saleId (optional UUID)", () => {
    it("accepts a valid v4 UUID", () => {
      const parsed = excelSaleRowSchema.parse({
        ...minValid,
        saleId: "11111111-1111-4111-8111-111111111111",
      });
      expect(parsed.saleId).toBe("11111111-1111-4111-8111-111111111111");
    });

    it("normalizes blank saleId to null and passes", () => {
      const parsed = excelSaleRowSchema.parse({ ...minValid, saleId: "" });
      expect(parsed.saleId).toBeNull();
    });

    it("rejects a non-UUID saleId", () => {
      expect(() =>
        excelSaleRowSchema.parse({ ...minValid, saleId: "not-a-uuid" }),
      ).toThrow();
    });
  });

  describe("phone (optional)", () => {
    it("strips spaces + hyphens from phone", () => {
      const parsed = excelSaleRowSchema.parse({
        ...minValid,
        phone: "980-000 0001",
      });
      expect(parsed.phone).toBe("9800000001");
    });

    it("defaults to null when omitted", () => {
      const parsed = excelSaleRowSchema.parse(minValid);
      expect(parsed.phone).toBeNull();
    });

    it("returns null for empty/dash values", () => {
      const parsed = excelSaleRowSchema.parse({ ...minValid, phone: "   " });
      expect(parsed.phone).toBeNull();
    });
  });

  describe("dateOfSale", () => {
    it("parses ISO yyyy-mm-dd strings", () => {
      const parsed = excelSaleRowSchema.parse({
        ...minValid,
        dateOfSale: "2024-06-15",
      });
      expect(parsed.dateOfSale).toBeInstanceOf(Date);
      expect(parsed.dateOfSale?.getUTCFullYear()).toBe(2024);
    });

    it("returns null for empty values", () => {
      const parsed = excelSaleRowSchema.parse({
        ...minValid,
        dateOfSale: "",
      });
      expect(parsed.dateOfSale).toBeNull();
    });

    it("returns null for unparseable strings", () => {
      const parsed = excelSaleRowSchema.parse({
        ...minValid,
        dateOfSale: "not-a-date",
      });
      expect(parsed.dateOfSale).toBeNull();
    });

    it("parses Excel serial numbers", () => {
      const parsed = excelSaleRowSchema.parse({ ...minValid, dateOfSale: 1 });
      expect(parsed.dateOfSale).toBeInstanceOf(Date);
    });
  });

  describe("quantity (required, > 0, floored)", () => {
    it("floors fractional quantity", () => {
      const parsed = excelSaleRowSchema.parse({ ...minValid, quantity: 3.7 });
      expect(parsed.quantity).toBe(3);
    });

    it("floors fractional numeric-string quantity", () => {
      const parsed = excelSaleRowSchema.parse({
        ...minValid,
        quantity: "5.9",
      });
      expect(parsed.quantity).toBe(5);
    });

    it("rejects zero quantity", () => {
      expect(() =>
        excelSaleRowSchema.parse({ ...minValid, quantity: 0 }),
      ).toThrow();
    });

    it("rejects negative quantity", () => {
      expect(() =>
        excelSaleRowSchema.parse({ ...minValid, quantity: -1 }),
      ).toThrow();
    });

    it("throws on unparseable quantity", () => {
      expect(() =>
        excelSaleRowSchema.parse({ ...minValid, quantity: "abc" }),
      ).toThrow();
    });
  });

  describe("mrp / finalAmount (required, >= 0)", () => {
    it("parses numeric-string mrp/finalAmount", () => {
      const parsed = excelSaleRowSchema.parse({
        ...minValid,
        mrp: "99.5",
        finalAmount: "149.99",
      });
      expect(parsed.mrp).toBe(99.5);
      expect(parsed.finalAmount).toBe(149.99);
    });

    it("accepts zero", () => {
      const parsed = excelSaleRowSchema.parse({
        ...minValid,
        mrp: 0,
        finalAmount: 0,
      });
      expect(parsed.mrp).toBe(0);
      expect(parsed.finalAmount).toBe(0);
    });

    it("rejects negative mrp", () => {
      expect(() =>
        excelSaleRowSchema.parse({ ...minValid, mrp: -1 }),
      ).toThrow();
    });

    it("rejects negative finalAmount", () => {
      expect(() =>
        excelSaleRowSchema.parse({ ...minValid, finalAmount: -0.01 }),
      ).toThrow();
    });

    it("throws on unparseable mrp", () => {
      expect(() =>
        excelSaleRowSchema.parse({ ...minValid, mrp: "xyz" }),
      ).toThrow();
    });
  });

  describe("discount (optional, clamped to [0, 100])", () => {
    it("defaults to 0 when omitted", () => {
      const parsed = excelSaleRowSchema.parse(minValid);
      expect(parsed.discount).toBe(0);
    });

    it("defaults to 0 for unparseable strings", () => {
      const parsed = excelSaleRowSchema.parse({
        ...minValid,
        discount: "abc",
      });
      expect(parsed.discount).toBe(0);
    });

    it("clamps values above 100 to 100", () => {
      const parsed = excelSaleRowSchema.parse({ ...minValid, discount: 150 });
      expect(parsed.discount).toBe(100);
    });

    it("clamps negative values to 0", () => {
      const parsed = excelSaleRowSchema.parse({ ...minValid, discount: -5 });
      expect(parsed.discount).toBe(0);
    });

    it("passes mid-range values through", () => {
      const parsed = excelSaleRowSchema.parse({ ...minValid, discount: 25.5 });
      expect(parsed.discount).toBe(25.5);
    });
  });

  describe("paymentMethod (optional, uppercased, regex-validated)", () => {
    it("defaults to null when omitted", () => {
      const parsed = excelSaleRowSchema.parse(minValid);
      expect(parsed.paymentMethod).toBeNull();
    });

    it("uppercases valid payment methods", () => {
      const parsed = excelSaleRowSchema.parse({
        ...minValid,
        paymentMethod: "cash",
      });
      expect(parsed.paymentMethod).toBe("CASH");
    });

    it("allows underscore + digits", () => {
      const parsed = excelSaleRowSchema.parse({
        ...minValid,
        paymentMethod: "bank_transfer_2",
      });
      expect(parsed.paymentMethod).toBe("BANK_TRANSFER_2");
    });

    it("normalizes empty string to null", () => {
      const parsed = excelSaleRowSchema.parse({
        ...minValid,
        paymentMethod: "",
      });
      expect(parsed.paymentMethod).toBeNull();
    });

    it("rejects payment method with special characters", () => {
      expect(() =>
        excelSaleRowSchema.parse({
          ...minValid,
          paymentMethod: "cash-on-delivery",
        }),
      ).toThrow();
    });

    it("rejects too-short payment method", () => {
      expect(() =>
        excelSaleRowSchema.parse({ ...minValid, paymentMethod: "C" }),
      ).toThrow();
    });
  });
});
