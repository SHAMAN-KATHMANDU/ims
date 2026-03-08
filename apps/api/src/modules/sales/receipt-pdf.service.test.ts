import { describe, it, expect } from "vitest";
import { generateReceiptPdf } from "./receipt-pdf.service";

const mockSale = {
  saleCode: "SL-001",
  createdAt: new Date("2025-03-08T10:00:00Z"),
  subtotal: 100,
  discount: 10,
  total: 90,
  notes: null,
  tenant: { name: "Test Org" },
  location: { id: "loc1", name: "Store A" },
  member: { id: "m1", phone: "9876543210", name: "John" },
  createdBy: { id: "u1", username: "cashier1", role: "user" },
  payments: [{ id: "p1", method: "CASH", amount: 90, createdAt: new Date() }],
  items: [
    {
      id: "i1",
      quantity: 2,
      unitPrice: 50,
      discountPercent: 0,
      lineTotal: 100,
      variation: {
        product: { id: "prod1", name: "Product A", category: { name: "Cat" } },
        attributes: [
          {
            attributeType: { name: "Size" },
            attributeValue: { value: "M" },
          },
        ],
      },
      subVariation: null,
    },
  ],
};

describe("generateReceiptPdf", () => {
  it("returns a buffer with valid PDF header", async () => {
    const buffer = await generateReceiptPdf(mockSale);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
