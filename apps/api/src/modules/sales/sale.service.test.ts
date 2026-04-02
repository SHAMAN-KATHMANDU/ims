import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSale,
  previewSale,
  getSaleById,
  addPayment,
  deleteSale,
  calculateSaleItems,
  SaleCalculationError,
} from "./sale.service";

const mockPublishDomainEvent = vi.fn();
const mockSyncLowStockSignal = vi.fn();
const mockFindLocationById = vi.fn();
const mockFindVariationWithDiscounts = vi.fn();
const mockFindInventory = vi.fn();
const mockFindPromoByCodeWithProducts = vi.fn();
const mockFindPromoByCode = vi.fn();
const mockIncrementPromoUsage = vi.fn();
const mockFindMemberByPhone = vi.fn();
const mockFindMemberById = vi.fn();
const mockCreateMember = vi.fn();
const mockFindContactForSale = vi.fn();
const mockCreateSaleWithItemsAndDeductInventory = vi.fn();
const mockUpdateMemberAggregation = vi.fn();
const mockFindSaleById = vi.fn();
const mockFindSaleWithPaymentsOnly = vi.fn();
const mockCreateSalePayment = vi.fn();
const mockSoftDeleteSale = vi.fn();
const mockAssertMethodAllowed = vi.fn();

vi.mock("./sale.repository", () => ({
  findVariationWithDiscounts: (...args: unknown[]) =>
    mockFindVariationWithDiscounts(...args),
  findInventory: (...args: unknown[]) => mockFindInventory(...args),
  findPromoByCodeWithProducts: (...args: unknown[]) =>
    mockFindPromoByCodeWithProducts(...args),
  findPromoByCode: (...args: unknown[]) => mockFindPromoByCode(...args),
  incrementPromoUsage: (...args: unknown[]) => mockIncrementPromoUsage(...args),
  findLocationById: (...args: unknown[]) => mockFindLocationById(...args),
  findMemberByPhone: (...args: unknown[]) => mockFindMemberByPhone(...args),
  findMemberById: (...args: unknown[]) => mockFindMemberById(...args),
  createMember: (...args: unknown[]) => mockCreateMember(...args),
  findContactForSale: (...args: unknown[]) => mockFindContactForSale(...args),
  createSaleWithItemsAndDeductInventory: (...args: unknown[]) =>
    mockCreateSaleWithItemsAndDeductInventory(...args),
  updateMemberAggregation: (...args: unknown[]) =>
    mockUpdateMemberAggregation(...args),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  findUserLastLogin: vi.fn(),
  findSaleById: (...args: unknown[]) => mockFindSaleById(...args),
  findSaleWithPaymentsOnly: (...args: unknown[]) =>
    mockFindSaleWithPaymentsOnly(...args),
  createSalePayment: (...args: unknown[]) => mockCreateSalePayment(...args),
  softDeleteSale: (...args: unknown[]) => mockSoftDeleteSale(...args),
  findShowroomLocations: vi.fn(),
  findSalesPaginatedByFilter: vi.fn(),
  countSalesByFilter: vi.fn(),
  findSalesPaginatedForUserSince: vi.fn(),
  countSalesForUserSince: vi.fn(),
  aggregateSalesByFilter: vi.fn(),
  aggregateSalesByTypeByFilter: vi.fn(),
  findSalesForExportByFilter: vi.fn(),
  findSalesForDailyChartByFilter: vi.fn(),
}));

vi.mock("@/utils/phone", () => ({
  parseAndValidatePhone: (phone: string) =>
    phone === "+9779812345678"
      ? { valid: true, e164: "+9779812345678" }
      : { valid: false, message: "Invalid phone" },
}));

vi.mock("@/modules/tenant-settings/tenant-settings.service", () => ({
  default: {
    assertMethodAllowed: (...args: unknown[]) =>
      mockAssertMethodAllowed(...args),
  },
}));
vi.mock("@/modules/automation/automation.service", () => ({
  default: {
    publishDomainEvent: (...args: unknown[]) => mockPublishDomainEvent(...args),
    syncLowStockSignal: (...args: unknown[]) => mockSyncLowStockSignal(...args),
  },
}));

const ctx = { tenantId: "t1", userId: "u1" };
const showroomLocation = {
  id: "loc1",
  name: "Showroom",
  type: "SHOWROOM",
  isActive: true,
};
const mockVariation = {
  id: "v1",
  productId: "p1",
  product: {
    id: "p1",
    name: "Widget",
    imsCode: "P-001",
    mrp: 100,
    discounts: [] as Array<{
      id: string;
      valueType: "FLAT" | "PERCENTAGE";
      value: number;
      discountPercentage: number;
      discountType: { name: string };
    }>,
  },
  subVariations: [],
};

function variationWithProductDiscounts(
  discounts: Array<{
    id: string;
    valueType: "FLAT" | "PERCENTAGE";
    value: number;
    discountTypeName: string;
  }>,
) {
  return {
    ...mockVariation,
    product: {
      ...mockVariation.product,
      discounts: discounts.map((d) => ({
        id: d.id,
        valueType: d.valueType,
        value: d.value,
        discountPercentage: d.value,
        discountType: { name: d.discountTypeName },
      })),
    },
  };
}

function activePromo(
  overrides: {
    overrideDiscounts?: boolean;
    allowStacking?: boolean;
    valueType?: "FLAT" | "PERCENTAGE";
    value?: number;
    eligibility?: "ALL" | "MEMBER" | "NON_MEMBER";
  } = {},
) {
  return {
    isActive: true,
    validFrom: null as Date | null,
    validTo: null as Date | null,
    usageLimit: null as number | null,
    usageCount: 0,
    products: [] as Array<{ productId: string }>,
    eligibility: overrides.eligibility ?? "ALL",
    valueType: overrides.valueType ?? "FLAT",
    value: overrides.value ?? 0,
    overrideDiscounts: overrides.overrideDiscounts ?? false,
    allowStacking: overrides.allowStacking ?? false,
  };
}

describe("SaleService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertMethodAllowed.mockResolvedValue(undefined);
    mockPublishDomainEvent.mockResolvedValue(undefined);
    mockSyncLowStockSignal.mockResolvedValue(undefined);
  });

  describe("calculateSaleItems", () => {
    it("throws when item has no variationId", async () => {
      await expect(
        calculateSaleItems(
          [{ variationId: "", subVariationId: null, quantity: 1 }],
          "loc1",
          "GENERAL",
          "t1",
        ),
      ).rejects.toThrow(SaleCalculationError);

      expect(mockFindVariationWithDiscounts).not.toHaveBeenCalled();
    });

    it("throws when item has invalid quantity", async () => {
      await expect(
        calculateSaleItems(
          [{ variationId: "v1", quantity: 0 }],
          "loc1",
          "GENERAL",
          "t1",
        ),
      ).rejects.toThrow(SaleCalculationError);

      await expect(
        calculateSaleItems(
          [{ variationId: "v1", quantity: -1 }],
          "loc1",
          "GENERAL",
          "t1",
        ),
      ).rejects.toThrow(SaleCalculationError);
    });

    it("throws when variation not found", async () => {
      mockFindVariationWithDiscounts.mockResolvedValue(null);

      await expect(
        calculateSaleItems(
          [{ variationId: "missing", quantity: 1 }],
          "loc1",
          "GENERAL",
          "t1",
        ),
      ).rejects.toMatchObject(
        expect.objectContaining({
          message: expect.stringContaining("not found"),
          status: 404,
        }),
      );
    });

    it("throws when insufficient stock", async () => {
      mockFindVariationWithDiscounts.mockResolvedValue(mockVariation);
      mockFindInventory.mockResolvedValue({ quantity: 0 });

      await expect(
        calculateSaleItems(
          [{ variationId: "v1", quantity: 5 }],
          "loc1",
          "GENERAL",
          "t1",
        ),
      ).rejects.toMatchObject(
        expect.objectContaining({
          message: expect.stringContaining("Insufficient stock"),
          status: 400,
        }),
      );
    });

    it("returns correct totals when stock is sufficient", async () => {
      mockFindVariationWithDiscounts.mockResolvedValue(mockVariation);
      mockFindInventory.mockResolvedValue({ quantity: 10 });
      mockFindPromoByCodeWithProducts.mockResolvedValue(null);

      const result = await calculateSaleItems(
        [{ variationId: "v1", quantity: 2 }],
        "loc1",
        "GENERAL",
        "t1",
      );

      expect(result.subtotal).toBe(200);
      expect(result.totalDiscount).toBe(0);
      expect(result.totalProductDiscount).toBe(0);
      expect(result.totalPromoDiscount).toBe(0);
      expect(result.promoOverrodeProductDiscount).toBe(false);
      expect(result.total).toBe(200);
      expect(result.processedItems).toHaveLength(1);
      expect(result.processedItems[0]).toMatchObject({
        variationId: "v1",
        quantity: 2,
        unitPrice: 100,
        lineTotal: 200,
      });
    });

    it("catalog FLAT discount: totalProductDiscount equals flat, no promo", async () => {
      mockFindVariationWithDiscounts.mockResolvedValue(
        variationWithProductDiscounts([
          {
            id: "d-flat",
            valueType: "FLAT",
            value: 15,
            discountTypeName: "non-member",
          },
        ]),
      );
      mockFindInventory.mockResolvedValue({ quantity: 10 });
      mockFindPromoByCodeWithProducts.mockResolvedValue(null);

      const result = await calculateSaleItems(
        [{ variationId: "v1", quantity: 2, discountId: "d-flat" }],
        "loc1",
        "GENERAL",
        "t1",
      );

      expect(result.subtotal).toBe(200);
      expect(result.totalDiscount).toBe(15);
      expect(result.totalProductDiscount).toBe(15);
      expect(result.totalPromoDiscount).toBe(0);
      expect(result.promoOverrodeProductDiscount).toBe(false);
      expect(result.total).toBe(185);
    });

    it("catalog PERCENTAGE discount applies to line subtotal", async () => {
      mockFindVariationWithDiscounts.mockResolvedValue(
        variationWithProductDiscounts([
          {
            id: "d-pct",
            valueType: "PERCENTAGE",
            value: 10,
            discountTypeName: "wholesale",
          },
        ]),
      );
      mockFindInventory.mockResolvedValue({ quantity: 10 });
      mockFindPromoByCodeWithProducts.mockResolvedValue(null);

      const result = await calculateSaleItems(
        [{ variationId: "v1", quantity: 2, discountId: "d-pct" }],
        "loc1",
        "GENERAL",
        "t1",
      );

      expect(result.totalDiscount).toBe(20);
      expect(result.totalProductDiscount).toBe(20);
      expect(result.totalPromoDiscount).toBe(0);
      expect(result.total).toBe(180);
    });

    it("auto-selects best eligible catalog discount when discountId omitted", async () => {
      mockFindVariationWithDiscounts.mockResolvedValue(
        variationWithProductDiscounts([
          {
            id: "d-low",
            valueType: "FLAT",
            value: 5,
            discountTypeName: "non-member",
          },
          {
            id: "d-high",
            valueType: "FLAT",
            value: 25,
            discountTypeName: "wholesale",
          },
        ]),
      );
      mockFindInventory.mockResolvedValue({ quantity: 10 });
      mockFindPromoByCodeWithProducts.mockResolvedValue(null);

      const result = await calculateSaleItems(
        [{ variationId: "v1", quantity: 1 }],
        "loc1",
        "GENERAL",
        "t1",
      );

      expect(result.totalProductDiscount).toBe(25);
      expect(result.total).toBe(75);
    });

    it("manual discount percent splits product vs promo (all product)", async () => {
      mockFindVariationWithDiscounts.mockResolvedValue(mockVariation);
      mockFindInventory.mockResolvedValue({ quantity: 10 });
      mockFindPromoByCodeWithProducts.mockResolvedValue(null);

      const result = await calculateSaleItems(
        [
          {
            variationId: "v1",
            quantity: 2,
            manualDiscountPercent: 25,
            discountReason: "VIP",
          },
        ],
        "loc1",
        "GENERAL",
        "t1",
        { userId: "u1", userRole: "admin" },
      );

      expect(result.totalDiscount).toBe(50);
      expect(result.totalProductDiscount).toBe(50);
      expect(result.totalPromoDiscount).toBe(0);
      expect(result.promoOverrodeProductDiscount).toBe(false);
      expect(result.total).toBe(150);
    });

    it("manual discount amount splits product vs promo (all product)", async () => {
      mockFindVariationWithDiscounts.mockResolvedValue(mockVariation);
      mockFindInventory.mockResolvedValue({ quantity: 10 });
      mockFindPromoByCodeWithProducts.mockResolvedValue(null);

      const result = await calculateSaleItems(
        [
          {
            variationId: "v1",
            quantity: 2,
            manualDiscountAmount: 42,
            discountReason: "clearance",
          },
        ],
        "loc1",
        "GENERAL",
        "t1",
        { userId: "u1", userRole: "admin" },
      );

      expect(result.totalDiscount).toBe(42);
      expect(result.totalProductDiscount).toBe(42);
      expect(result.totalPromoDiscount).toBe(0);
      expect(result.total).toBe(158);
    });

    it("promo overrideDiscounts: promo replaces catalog; product discount zero; flag set", async () => {
      mockFindVariationWithDiscounts.mockResolvedValue(
        variationWithProductDiscounts([
          {
            id: "d1",
            valueType: "FLAT",
            value: 10,
            discountTypeName: "non-member",
          },
        ]),
      );
      mockFindInventory.mockResolvedValue({ quantity: 10 });
      mockFindPromoByCodeWithProducts.mockResolvedValue(
        activePromo({ overrideDiscounts: true, value: 50 }),
      );

      const result = await calculateSaleItems(
        [
          {
            variationId: "v1",
            quantity: 2,
            discountId: "d1",
            promoCode: "MEGA",
          },
        ],
        "loc1",
        "GENERAL",
        "t1",
      );

      expect(result.totalDiscount).toBe(50);
      expect(result.totalProductDiscount).toBe(0);
      expect(result.totalPromoDiscount).toBe(50);
      expect(result.promoOverrodeProductDiscount).toBe(true);
      expect(result.total).toBe(150);
    });

    it("promo allowStacking: accumulates product + promo amounts", async () => {
      mockFindVariationWithDiscounts.mockResolvedValue(
        variationWithProductDiscounts([
          {
            id: "d1",
            valueType: "FLAT",
            value: 10,
            discountTypeName: "non-member",
          },
        ]),
      );
      mockFindInventory.mockResolvedValue({ quantity: 10 });
      mockFindPromoByCodeWithProducts.mockResolvedValue(
        activePromo({ allowStacking: true, value: 20 }),
      );

      const result = await calculateSaleItems(
        [
          {
            variationId: "v1",
            quantity: 2,
            discountId: "d1",
            promoCode: "STACK",
          },
        ],
        "loc1",
        "GENERAL",
        "t1",
      );

      expect(result.totalDiscount).toBe(30);
      expect(result.totalProductDiscount).toBe(10);
      expect(result.totalPromoDiscount).toBe(20);
      expect(result.promoOverrodeProductDiscount).toBe(false);
      expect(result.total).toBe(170);
    });

    it("promo best-deal: promo wins over catalog", async () => {
      mockFindVariationWithDiscounts.mockResolvedValue(
        variationWithProductDiscounts([
          {
            id: "d1",
            valueType: "FLAT",
            value: 10,
            discountTypeName: "non-member",
          },
        ]),
      );
      mockFindInventory.mockResolvedValue({ quantity: 10 });
      mockFindPromoByCodeWithProducts.mockResolvedValue(
        activePromo({ value: 40 }),
      );

      const result = await calculateSaleItems(
        [
          {
            variationId: "v1",
            quantity: 2,
            discountId: "d1",
            promoCode: "WIN",
          },
        ],
        "loc1",
        "GENERAL",
        "t1",
      );

      expect(result.totalDiscount).toBe(40);
      expect(result.totalProductDiscount).toBe(0);
      expect(result.totalPromoDiscount).toBe(40);
      expect(result.promoOverrodeProductDiscount).toBe(true);
      expect(result.total).toBe(160);
    });

    it("promo best-deal: product wins — totalPromoDiscount is zero", async () => {
      mockFindVariationWithDiscounts.mockResolvedValue(
        variationWithProductDiscounts([
          {
            id: "d1",
            valueType: "FLAT",
            value: 30,
            discountTypeName: "non-member",
          },
        ]),
      );
      mockFindInventory.mockResolvedValue({ quantity: 10 });
      mockFindPromoByCodeWithProducts.mockResolvedValue(
        activePromo({ value: 10 }),
      );

      const result = await calculateSaleItems(
        [
          {
            variationId: "v1",
            quantity: 2,
            discountId: "d1",
            promoCode: "LOSE",
          },
        ],
        "loc1",
        "GENERAL",
        "t1",
      );

      expect(result.totalDiscount).toBe(30);
      expect(result.totalProductDiscount).toBe(30);
      expect(result.totalPromoDiscount).toBe(0);
      expect(result.promoOverrodeProductDiscount).toBe(false);
      expect(result.total).toBe(170);
    });

    it("manual discount above 20% throws 403 for non-admin when opts provided", async () => {
      mockFindVariationWithDiscounts.mockResolvedValue(mockVariation);
      mockFindInventory.mockResolvedValue({ quantity: 10 });
      mockFindPromoByCodeWithProducts.mockResolvedValue(null);

      await expect(
        calculateSaleItems(
          [
            {
              variationId: "v1",
              quantity: 1,
              manualDiscountPercent: 25,
              discountReason: "test",
            },
          ],
          "loc1",
          "GENERAL",
          "t1",
          { userId: "u1", userRole: "user" },
        ),
      ).rejects.toMatchObject({
        status: 403,
        message: expect.stringContaining("20%"),
      });
    });

    it("manual discount above 20% allowed for admin when opts provided", async () => {
      mockFindVariationWithDiscounts.mockResolvedValue(mockVariation);
      mockFindInventory.mockResolvedValue({ quantity: 10 });
      mockFindPromoByCodeWithProducts.mockResolvedValue(null);

      const result = await calculateSaleItems(
        [
          {
            variationId: "v1",
            quantity: 1,
            manualDiscountPercent: 25,
            discountReason: "approved",
          },
        ],
        "loc1",
        "GENERAL",
        "t1",
        { userId: "u1", userRole: "admin" },
      );

      expect(result.totalDiscount).toBe(25);
      expect(result.totalProductDiscount).toBe(25);
    });
  });

  describe("createSale", () => {
    it("throws 404 when location not found", async () => {
      mockFindLocationById.mockResolvedValue(null);

      await expect(
        createSale(ctx, {
          locationId: "missing",
          items: [{ variationId: "v1", quantity: 1 }],
        }),
      ).rejects.toMatchObject({
        message: "Location not found",
        statusCode: 404,
      });

      expect(mockCreateSaleWithItemsAndDeductInventory).not.toHaveBeenCalled();
    });

    it("throws 400 when location is not showroom", async () => {
      mockFindLocationById.mockResolvedValue({
        ...showroomLocation,
        type: "WAREHOUSE",
      });

      await expect(
        createSale(ctx, {
          locationId: "loc1",
          items: [{ variationId: "v1", quantity: 1 }],
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("showrooms"),
        statusCode: 400,
      });
    });

    it("throws 400 when location is inactive", async () => {
      mockFindLocationById.mockResolvedValue({
        ...showroomLocation,
        isActive: false,
      });

      await expect(
        createSale(ctx, {
          locationId: "loc1",
          items: [{ variationId: "v1", quantity: 1 }],
        }),
      ).rejects.toMatchObject({
        message: "Location is inactive",
        statusCode: 400,
      });
    });

    it("throws 400 when credit sale without member or contact", async () => {
      mockFindLocationById.mockResolvedValue(showroomLocation);
      mockFindVariationWithDiscounts.mockResolvedValue(mockVariation);
      mockFindInventory.mockResolvedValue({ quantity: 10 });

      await expect(
        createSale(ctx, {
          locationId: "loc1",
          isCreditSale: true,
          items: [{ variationId: "v1", quantity: 1 }],
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("Credit sales require"),
        statusCode: 400,
      });
    });

    it("throws 400 when payment sum does not match total", async () => {
      mockFindLocationById.mockResolvedValue(showroomLocation);
      mockFindVariationWithDiscounts.mockResolvedValue(mockVariation);
      mockFindInventory.mockResolvedValue({ quantity: 10 });

      await expect(
        createSale(ctx, {
          locationId: "loc1",
          items: [{ variationId: "v1", quantity: 1 }],
          payments: [
            { method: "CASH", amount: 50 },
            { method: "CARD", amount: 30 },
          ],
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("Sum of payment sources"),
        statusCode: 400,
      });
    });

    it("throws 400 when payment method is not allowed", async () => {
      mockFindLocationById.mockResolvedValue(showroomLocation);
      mockFindVariationWithDiscounts.mockResolvedValue(mockVariation);
      mockFindInventory.mockResolvedValue({ quantity: 10 });
      mockAssertMethodAllowed.mockRejectedValue(
        Object.assign(new Error("Unsupported payment method: IME_PAY"), {
          statusCode: 400,
        }),
      );

      await expect(
        createSale(ctx, {
          locationId: "loc1",
          items: [{ variationId: "v1", quantity: 1 }],
          payments: [{ method: "IME_PAY", amount: 100 }],
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("Unsupported payment method"),
        statusCode: 400,
      });
    });

    it("creates sale and deducts inventory on success", async () => {
      mockFindLocationById.mockResolvedValue(showroomLocation);
      mockFindVariationWithDiscounts.mockResolvedValue(mockVariation);
      mockFindInventory.mockResolvedValue({ quantity: 10 });
      mockCreateSaleWithItemsAndDeductInventory.mockResolvedValue({
        id: "sale1",
        saleCode: "SL-20240101-ABCD",
        locationId: "loc1",
        subtotal: 100,
        total: 100,
        memberId: null,
        contactId: null,
        items: [{ variationId: "v1", quantity: 1 }],
      });

      const result = await createSale(ctx, {
        locationId: "loc1",
        items: [{ variationId: "v1", quantity: 1 }],
        payments: [{ method: "CASH", amount: 100 }],
      });

      expect(result.saleCode).toMatch(/^SL-/);
      expect(mockCreateSaleWithItemsAndDeductInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          locationId: "loc1",
          createdById: "u1",
          subtotal: 100,
          total: 100,
          items: expect.arrayContaining([
            expect.objectContaining({
              variationId: "v1",
              quantity: 1,
              unitPrice: 100,
            }),
          ]),
        }),
      );
    });
  });

  describe("previewSale", () => {
    it("returns calculation result without persisting", async () => {
      mockFindLocationById.mockResolvedValue(showroomLocation);
      mockFindVariationWithDiscounts.mockResolvedValue(mockVariation);
      mockFindInventory.mockResolvedValue({ quantity: 10 });

      const result = await previewSale(ctx, {
        locationId: "loc1",
        items: [{ variationId: "v1", quantity: 3 }],
      });

      expect(result.subtotal).toBe(300);
      expect(result.total).toBe(300);
      expect(mockCreateSaleWithItemsAndDeductInventory).not.toHaveBeenCalled();
    });
  });

  describe("getSaleById", () => {
    it("returns sale when found", async () => {
      const sale = { id: "s1", saleCode: "S-001", total: 100 };
      mockFindSaleById.mockResolvedValue(sale);

      const result = await getSaleById("s1");
      expect(result).toEqual(sale);
    });

    it("throws 404 when sale not found", async () => {
      mockFindSaleById.mockResolvedValue(null);

      await expect(getSaleById("missing")).rejects.toMatchObject({
        message: "Sale not found",
        statusCode: 404,
      });
    });
  });

  describe("addPayment", () => {
    it("throws 404 when sale not found", async () => {
      mockFindSaleWithPaymentsOnly.mockResolvedValue(null);

      await expect(
        addPayment("missing", { method: "CASH", amount: 50 }),
      ).rejects.toMatchObject({
        message: "Sale not found",
        statusCode: 404,
      });
    });

    it("throws 400 when sale is not credit sale", async () => {
      mockFindSaleWithPaymentsOnly.mockResolvedValue({
        id: "s1",
        isCreditSale: false,
        total: 100,
        payments: [],
      });

      await expect(
        addPayment("s1", { method: "CASH", amount: 50 }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("credit sales"),
        statusCode: 400,
      });
    });

    it("throws 400 when payment exceeds balance due", async () => {
      mockFindSaleWithPaymentsOnly.mockResolvedValue({
        id: "s1",
        tenantId: "t1",
        isCreditSale: true,
        total: 100,
        payments: [{ amount: 50 }],
      });

      await expect(
        addPayment("s1", { method: "CASH", amount: 60 }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("exceeds balance"),
        statusCode: 400,
      });
    });

    it("throws 400 when payment method is not allowed", async () => {
      mockFindSaleWithPaymentsOnly.mockResolvedValue({
        id: "s1",
        tenantId: "t1",
        isCreditSale: true,
        total: 100,
        payments: [],
      });
      mockAssertMethodAllowed.mockRejectedValue(
        Object.assign(new Error("Unsupported payment method: IME_PAY"), {
          statusCode: 400,
        }),
      );

      await expect(
        addPayment("s1", { method: "IME_PAY", amount: 50 }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("Unsupported payment method"),
        statusCode: 400,
      });
    });

    it("creates payment when valid", async () => {
      const creditSale = {
        id: "s1",
        tenantId: "t1",
        isCreditSale: true,
        total: 100,
        payments: [],
      };
      mockFindSaleWithPaymentsOnly.mockResolvedValue(creditSale);
      mockCreateSalePayment.mockResolvedValue({
        id: "pay1",
        amount: 50,
      });
      mockFindSaleById.mockResolvedValue({
        ...creditSale,
        payments: [{ id: "pay1", amount: 50 }],
      });

      const result = await addPayment("s1", {
        method: "CASH",
        amount: 50,
      });

      expect(result.payment.amount).toBe(50);
      expect(mockCreateSalePayment).toHaveBeenCalledWith({
        saleId: "s1",
        method: "CASH",
        amount: 50,
      });
    });
  });

  describe("deleteSale", () => {
    it("publishes an automation event after soft delete", async () => {
      mockFindSaleById.mockResolvedValue({
        id: "sale-1",
        saleCode: "S-001",
        tenantId: "t1",
        locationId: "loc1",
        memberId: null,
        contactId: "contact-1",
        total: 2500,
        items: [],
      });
      mockSoftDeleteSale.mockResolvedValue({ success: true });

      await deleteSale("sale-1", "u1", "voided");

      expect(mockPublishDomainEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          eventName: "sales.sale.deleted",
          entityId: "sale-1",
        }),
      );
    });
  });
});
