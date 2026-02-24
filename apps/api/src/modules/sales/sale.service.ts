import prisma from "@/config/prisma";

// ── Shared types ──────────────────────────────────────────────────────────

export interface SaleItemInput {
  variationId: string;
  subVariationId?: string | null;
  quantity: number;
  discountId?: string | null;
  promoCode?: string;
}

export interface ProcessedItem {
  variationId: string;
  subVariationId: string | null;
  quantity: number;
  unitPrice: number;
  totalMrp: number;
  discountPercent: number;
  discountAmount: number;
  lineTotal: number;
  promoDiscount: number;
}

export interface CalculationResult {
  processedItems: ProcessedItem[];
  subtotal: number;
  totalDiscount: number;
  totalPromoDiscount: number;
  total: number;
}

export class SaleCalculationError extends Error {
  status: number;
  extra?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    extra?: Record<string, unknown>,
  ) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// ── Active-discount include fragment (reused by both create & preview) ────

function activeDiscountsInclude() {
  return {
    subVariations: { select: { id: true, name: true } },
    product: {
      include: {
        discounts: {
          where: {
            isActive: true,
            OR: [{ startDate: null }, { startDate: { lte: new Date() } }],
            AND: [
              { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
            ],
          },
          include: { discountType: true },
        },
      },
    },
  };
}

// ── Core calculation ──────────────────────────────────────────────────────

/**
 * Validates items, resolves discounts & promo codes, and computes totals.
 *
 * Pure calculation — no DB writes (stock decrement, promo usage, sale
 * creation) happen here. The caller decides what to persist.
 *
 * Throws `SaleCalculationError` on validation failures (bad item, missing
 * stock, unknown variation, etc.).
 */
export async function calculateSaleItems(
  items: SaleItemInput[],
  locationId: string,
  saleType: "GENERAL" | "MEMBER",
  tenantId: string,
): Promise<CalculationResult> {
  const processedItems: ProcessedItem[] = [];
  let subtotal = 0;
  let totalDiscount = 0;
  let totalPromoDiscount = 0;

  for (const item of items) {
    if (!item.variationId || !item.quantity || item.quantity <= 0) {
      throw new SaleCalculationError(
        400,
        "Each item must have a variationId and positive quantity",
      );
    }

    const variation = await prisma.productVariation.findUnique({
      where: { id: item.variationId },
      include: activeDiscountsInclude(),
    });

    if (!variation) {
      throw new SaleCalculationError(
        404,
        `Product variation ${item.variationId} not found`,
      );
    }

    // ── Sub-variation validation ──────────────────────────────────────

    const hasSubVariants = (variation.subVariations?.length ?? 0) > 0;
    const subVariationId = item.subVariationId ?? null;

    if (hasSubVariants && !subVariationId) {
      throw new SaleCalculationError(
        400,
        `Variation ${variation.imsCode} has sub-variants; please specify subVariationId`,
      );
    }
    if (!hasSubVariants && subVariationId) {
      throw new SaleCalculationError(
        400,
        `Variation ${variation.imsCode} has no sub-variants; do not send subVariationId`,
      );
    }
    if (subVariationId) {
      const belongs = variation.subVariations?.some(
        (s) => s.id === subVariationId,
      );
      if (!belongs) {
        throw new SaleCalculationError(
          400,
          `Sub-variation ${subVariationId} does not belong to variation ${item.variationId}`,
        );
      }
    }

    // ── Stock check ──────────────────────────────────────────────────

    const inventory =
      subVariationId != null
        ? await prisma.locationInventory.findUnique({
            where: {
              locationId_variationId_subVariationId: {
                locationId,
                variationId: item.variationId,
                subVariationId,
              },
            },
          })
        : await prisma.locationInventory.findFirst({
            where: {
              locationId,
              variationId: item.variationId,
              subVariationId: null,
            },
          });

    const availableStock = inventory?.quantity || 0;
    if (availableStock < item.quantity) {
      throw new SaleCalculationError(
        400,
        `Insufficient stock for ${variation.product.name} (${variation.imsCode}${subVariationId ? " / sub-variant" : ""})`,
        { available: availableStock, requested: item.quantity },
      );
    }

    // ── Price & discount resolution ──────────────────────────────────

    const unitPrice = Number(variation.product.mrp);
    const itemSubtotal = unitPrice * item.quantity;
    let discountPercent = 0;
    let discountAmount = 0;

    type DiscountRow = (typeof variation.product.discounts)[number] & {
      discountType: { name: string };
    };
    const activeDiscounts = variation.product.discounts as DiscountRow[];
    let baseDiscount: DiscountRow | null = null;

    if (item.discountId && item.discountId !== "none") {
      baseDiscount =
        activeDiscounts?.find((d) => d.id === item.discountId) ?? null;
    } else if (!item.discountId) {
      if (activeDiscounts && activeDiscounts.length > 0) {
        const eligible = activeDiscounts.filter((d) => {
          const tn = d.discountType.name.toLowerCase();
          if (saleType === "MEMBER") {
            return tn.includes("member") || tn.includes("non-member");
          }
          return tn.includes("non-member") || tn.includes("wholesale");
        });
        if (eligible.length > 0) {
          eligible.sort((a, b) => {
            const aS = a.discountType.name.toLowerCase() === "special" ? 1 : 0;
            const bS = b.discountType.name.toLowerCase() === "special" ? 1 : 0;
            if (aS !== bS) return bS - aS;
            const aV =
              a.valueType === "FLAT"
                ? Number(a.value)
                : (Number(a.value) / 100) * itemSubtotal;
            const bV =
              b.valueType === "FLAT"
                ? Number(b.value)
                : (Number(b.value) / 100) * itemSubtotal;
            return bV - aV;
          });
          baseDiscount = eligible[0];
        }
      }
    }

    if (baseDiscount) {
      const val =
        Number(baseDiscount.value) || Number(baseDiscount.discountPercentage);
      if (baseDiscount.valueType === "FLAT") {
        discountAmount += val;
      } else {
        discountPercent += val;
      }
    }

    // ── Promo code ───────────────────────────────────────────────────

    let itemPromoDiscount = 0;

    if (item.promoCode) {
      const promo = await prisma.promoCode.findFirst({
        where: { tenantId, code: item.promoCode },
        include: { products: { include: { product: true } } },
      });

      if (promo && promo.isActive) {
        const now = new Date();
        const withinDates =
          (!promo.validFrom || promo.validFrom <= now) &&
          (!promo.validTo || promo.validTo >= now) &&
          (!promo.usageLimit || promo.usageCount < promo.usageLimit);

        if (withinDates) {
          const isProductEligible =
            promo.products.length === 0 ||
            promo.products.some((pp) => pp.productId === variation.productId);

          let isCustomerEligible = false;
          if (promo.eligibility === "ALL") isCustomerEligible = true;
          else if (promo.eligibility === "MEMBER")
            isCustomerEligible = saleType === "MEMBER";
          else if (promo.eligibility === "NON_MEMBER")
            isCustomerEligible = saleType === "GENERAL";

          if (isProductEligible && isCustomerEligible) {
            const baseAfterProductDiscount =
              itemSubtotal -
              (discountAmount + itemSubtotal * (discountPercent / 100));

            let promoAmt = 0;
            if (promo.valueType === "FLAT") {
              promoAmt = Number(promo.value);
            } else {
              promoAmt = baseAfterProductDiscount * (Number(promo.value) / 100);
            }

            if (promo.overrideDiscounts) {
              discountAmount = promoAmt;
              discountPercent = 0;
            } else if (promo.allowStacking) {
              discountAmount += promoAmt;
            } else {
              const baseTotalDiscount =
                discountAmount + itemSubtotal * (discountPercent / 100);
              if (promoAmt > baseTotalDiscount) {
                discountAmount = promoAmt;
                discountPercent = 0;
              }
            }

            itemPromoDiscount = Math.min(promoAmt, itemSubtotal);
          }
        }
      }
    }

    // ── Clamp & accumulate ───────────────────────────────────────────

    const effectiveDiscount =
      Math.min(
        itemSubtotal,
        discountAmount + itemSubtotal * (discountPercent / 100),
      ) || 0;
    const lineTotal = itemSubtotal - effectiveDiscount;

    subtotal += itemSubtotal;
    totalDiscount += effectiveDiscount;
    totalPromoDiscount += itemPromoDiscount;

    processedItems.push({
      variationId: item.variationId,
      subVariationId: subVariationId ?? null,
      quantity: item.quantity,
      unitPrice,
      totalMrp: itemSubtotal,
      discountPercent,
      discountAmount: effectiveDiscount,
      lineTotal,
      promoDiscount: itemPromoDiscount,
    });
  }

  const total = Math.round((subtotal - totalDiscount) * 100) / 100;

  return {
    processedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalPromoDiscount: Math.round(totalPromoDiscount * 100) / 100,
    total,
  };
}
