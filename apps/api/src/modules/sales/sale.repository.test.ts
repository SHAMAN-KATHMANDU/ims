/**
 * Unit tests for sale.repository — createSaleWithItemsAndDeductInventory.
 * Verifies inventory deduction (LocationInventory and ProductVariation.stockQuantity) per #259.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSaleWithItemsAndDeductInventory,
  type CreateSaleWithItemsInput,
} from "./sale.repository";

const mockLocationInventoryFindFirst = vi.fn();
const mockLocationInventoryFindUnique = vi.fn();
const mockLocationInventoryUpdate = vi.fn();
const mockProductVariationUpdate = vi.fn();
const mockSaleCreate = vi.fn();

vi.mock("@/config/prisma", () => ({
  default: {
    $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>) => {
      const mockTx = {
        sale: {
          create: mockSaleCreate,
        },
        locationInventory: {
          findFirst: mockLocationInventoryFindFirst,
          findUnique: mockLocationInventoryFindUnique,
          update: mockLocationInventoryUpdate,
        },
        productVariation: {
          update: mockProductVariationUpdate,
        },
      };
      return callback(mockTx);
    }),
  },
}));

describe("createSaleWithItemsAndDeductInventory", () => {
  const baseInput: CreateSaleWithItemsInput = {
    tenantId: "tenant-1",
    saleCode: "SL-001",
    type: "GENERAL",
    isCreditSale: false,
    locationId: "loc-1",
    memberId: null,
    contactId: null,
    createdById: "user-1",
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

  it("decrements LocationInventory quantity for each sold item", async () => {
    await createSaleWithItemsAndDeductInventory(baseInput);

    expect(mockLocationInventoryFindFirst).toHaveBeenCalledWith({
      where: {
        locationId: "loc-1",
        variationId: "var-1",
        subVariationId: null,
      },
    });
    expect(mockLocationInventoryUpdate).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { quantity: { decrement: 2 } },
    });
  });

  it("decrements ProductVariation.stockQuantity for each sold item (#259)", async () => {
    await createSaleWithItemsAndDeductInventory(baseInput);

    expect(mockProductVariationUpdate).toHaveBeenCalledWith({
      where: { id: "var-1" },
      data: { stockQuantity: { decrement: 2 } },
    });
  });

  it("decrements both LocationInventory and stockQuantity for multiple items", async () => {
    const input: CreateSaleWithItemsInput = {
      ...baseInput,
      items: [
        {
          variationId: "var-1",
          subVariationId: null,
          quantity: 3,
          unitPrice: 30,
          totalMrp: 90,
          discountPercent: 0,
          discountAmount: 0,
          lineTotal: 90,
        },
        {
          variationId: "var-2",
          subVariationId: null,
          quantity: 1,
          unitPrice: 10,
          totalMrp: 10,
          discountPercent: 0,
          discountAmount: 0,
          lineTotal: 10,
        },
      ],
    };

    mockLocationInventoryFindFirst
      .mockResolvedValueOnce({
        id: "inv-1",
        locationId: "loc-1",
        variationId: "var-1",
        subVariationId: null,
        quantity: 10,
      })
      .mockResolvedValueOnce({
        id: "inv-2",
        locationId: "loc-1",
        variationId: "var-2",
        subVariationId: null,
        quantity: 5,
      });

    await createSaleWithItemsAndDeductInventory(input);

    expect(mockLocationInventoryUpdate).toHaveBeenCalledTimes(2);
    expect(mockLocationInventoryUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: "inv-1" },
      data: { quantity: { decrement: 3 } },
    });
    expect(mockLocationInventoryUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: "inv-2" },
      data: { quantity: { decrement: 1 } },
    });

    expect(mockProductVariationUpdate).toHaveBeenCalledTimes(2);
    expect(mockProductVariationUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: "var-1" },
      data: { stockQuantity: { decrement: 3 } },
    });
    expect(mockProductVariationUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: "var-2" },
      data: { stockQuantity: { decrement: 1 } },
    });
  });

  it("throws when inventory not found for location and variation", async () => {
    mockLocationInventoryFindFirst.mockResolvedValue(null);

    await expect(
      createSaleWithItemsAndDeductInventory(baseInput),
    ).rejects.toThrow(
      "Inventory not found for location loc-1, variation var-1",
    );

    expect(mockLocationInventoryUpdate).not.toHaveBeenCalled();
    expect(mockProductVariationUpdate).not.toHaveBeenCalled();
  });

  it("uses findUnique for items with subVariationId", async () => {
    const input: CreateSaleWithItemsInput = {
      ...baseInput,
      items: [
        {
          variationId: "var-1",
          subVariationId: "sub-1",
          quantity: 1,
          unitPrice: 50,
          totalMrp: 50,
          discountPercent: 0,
          discountAmount: 0,
          lineTotal: 50,
        },
      ],
    };

    mockLocationInventoryFindUnique.mockResolvedValue({
      id: "inv-sub-1",
      locationId: "loc-1",
      variationId: "var-1",
      subVariationId: "sub-1",
      quantity: 5,
    });

    await createSaleWithItemsAndDeductInventory(input);

    expect(mockLocationInventoryFindUnique).toHaveBeenCalledWith({
      where: {
        locationId_variationId_subVariationId: {
          locationId: "loc-1",
          variationId: "var-1",
          subVariationId: "sub-1",
        },
      },
    });
    expect(mockLocationInventoryUpdate).toHaveBeenCalledWith({
      where: { id: "inv-sub-1" },
      data: { quantity: { decrement: 1 } },
    });
    expect(mockProductVariationUpdate).toHaveBeenCalledWith({
      where: { id: "var-1" },
      data: { stockQuantity: { decrement: 1 } },
    });
  });
});
