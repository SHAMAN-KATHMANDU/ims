/**
 * Failure/resilience tests: transaction rollback.
 * Verifies that when the sale creation flow fails (inventory not found, DB error),
 * the error propagates — ensuring Prisma rolls back the transaction (no partial writes).
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

describe("Transaction rollback", () => {
  const baseInput: CreateSaleWithItemsInput = {
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

  it("throws when inventory not found — error propagates (transaction would rollback)", async () => {
    mockLocationInventoryFindFirst.mockResolvedValue(null);

    await expect(
      createSaleWithItemsAndDeductInventory(baseInput),
    ).rejects.toThrow(/Inventory not found/);

    expect(mockLocationInventoryUpdate).not.toHaveBeenCalled();
  });

  it("throws when sale.create fails — error propagates (transaction would rollback)", async () => {
    mockSaleCreate.mockRejectedValue(new Error("DB connection lost"));

    await expect(
      createSaleWithItemsAndDeductInventory(baseInput),
    ).rejects.toThrow("DB connection lost");
  });
});
