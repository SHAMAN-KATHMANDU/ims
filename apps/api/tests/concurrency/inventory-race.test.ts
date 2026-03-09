/**
 * Concurrency tests: inventory and sale.
 * Verifies that sale creation uses $transaction (atomic) and that
 * inventory deduction + sale creation happen in a single transaction.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSaleWithItemsAndDeductInventory,
  type CreateSaleWithItemsInput,
} from "@/modules/sales/sale.repository";

const mockSaleCreate = vi.fn();
const mockLocationInventoryFindFirst = vi.fn();
const mockLocationInventoryUpdate = vi.fn();
const mockProductVariationUpdate = vi.fn();

vi.mock("@/config/prisma", () => ({
  default: {
    $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) => {
      const mockTx = {
        sale: { create: mockSaleCreate },
        locationInventory: {
          findFirst: mockLocationInventoryFindFirst,
          findUnique: vi.fn().mockResolvedValue(null),
          update: mockLocationInventoryUpdate,
        },
        productVariation: { update: mockProductVariationUpdate },
      };
      return callback(mockTx);
    }),
  },
}));

describe("Inventory concurrency", () => {
  const input: CreateSaleWithItemsInput = {
    tenantId: "t1",
    saleCode: "SL-001",
    type: "GENERAL",
    isCreditSale: false,
    locationId: "loc-1",
    memberId: null,
    contactId: null,
    createdById: "u1",
    subtotal: 100,
    discount: 0,
    total: 100,
    notes: null,
    items: [
      {
        variationId: "var-1",
        subVariationId: null,
        quantity: 2,
        unitPrice: 50,
        totalMrp: 100,
        discountPercent: 0,
        discountAmount: 0,
        lineTotal: 100,
      },
    ],
    payments: [{ method: "CASH", amount: 100 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaleCreate.mockResolvedValue({
      id: "sale-1",
      saleCode: "SL-001",
      items: [],
      payments: [],
    });
    mockLocationInventoryFindFirst.mockResolvedValue({
      id: "inv-1",
      locationId: "loc-1",
      variationId: "var-1",
      subVariationId: null,
      quantity: 10,
    });
    mockLocationInventoryUpdate.mockResolvedValue({});
    mockProductVariationUpdate.mockResolvedValue({});
  });

  it("uses $transaction for atomicity (sale + inventory in one transaction)", async () => {
    const prisma = await import("@/config/prisma");

    await createSaleWithItemsAndDeductInventory(input);

    expect(prisma.default.$transaction).toHaveBeenCalledTimes(1);
  });

  it("handles 10 parallel sale requests without error (no shared mutable state)", async () => {
    const prisma = await import("@/config/prisma");

    const saleInputs = Array.from({ length: 10 }, (_, i) => ({
      ...input,
      saleCode: `SL-${String(i + 1).padStart(3, "0")}`,
    }));

    const results = await Promise.all(
      saleInputs.map((s) => createSaleWithItemsAndDeductInventory(s)),
    );

    expect(results).toHaveLength(10);
    expect(results.every((r) => r != null)).toBe(true);
    expect(prisma.default.$transaction).toHaveBeenCalledTimes(10);
  });
});
