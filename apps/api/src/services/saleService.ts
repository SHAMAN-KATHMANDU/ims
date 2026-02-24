/**
 * @deprecated Use modules/sales/sales.service.ts instead. This file is kept for
 * backward compatibility during migration. All createSale logic has been migrated
 * to sales.service with repository and strategy handlers.
 */

import prisma from "@/config/prisma";
import { AuditAction, AuditResource } from "@/shared/types";

export class SaleServiceError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public body?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "SaleServiceError";
  }
}

export function generateSaleCode(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SL-${dateStr}-${random}`;
}

export type CreateSaleItemInput = {
  variationId: string;
  subVariationId?: string | null;
  quantity: number;
  promoCode?: string;
};

export type CreateSalePaymentInput = {
  method: "CASH" | "CARD" | "CHEQUE" | "FONEPAY" | "QR";
  amount: number;
};

export type CreateSalePayload = {
  locationId: string;
  memberPhone?: string;
  memberName?: string;
  isCreditSale?: boolean;
  items: CreateSaleItemInput[];
  notes?: string;
  payments?: CreateSalePaymentInput[];
};

export async function createSale(
  payload: CreateSalePayload,
  userId: string,
  tenantId: string,
  auditMeta?: { ip?: string; userAgent?: string },
) {
  const {
    locationId,
    memberPhone,
    memberName,
    isCreditSale,
    items,
    notes,
    payments,
  } = payload;

  const location = await prisma.location.findUnique({
    where: { id: locationId },
  });
  if (!location) {
    throw new SaleServiceError(404, "Location not found");
  }
  if (!location.isActive) {
    throw new SaleServiceError(400, "Location is inactive");
  }
  if (location.type !== "SHOWROOM") {
    throw new SaleServiceError(
      400,
      "Sales can only be made at showrooms, not warehouses",
    );
  }

  let member: {
    id: string;
    isActive: boolean;
    createdAt: Date;
    firstPurchase: Date | null;
  } | null = null;
  let saleType: "GENERAL" | "MEMBER" = "GENERAL";

  if (memberPhone) {
    const normalizedPhone = memberPhone.replace(/[\s-]/g, "").trim();
    member = await prisma.member.findFirst({
      where: { phone: normalizedPhone },
    });
    if (!member) {
      member = await prisma.member.create({
        data: {
          tenantId,
          phone: normalizedPhone,
          name: memberName?.trim() || null,
        },
      });
    }
    if (member.isActive) {
      saleType = "MEMBER";
    }
  }

  if (isCreditSale === true && !member) {
    throw new SaleServiceError(
      400,
      "Credit sales require a customer (member). Please enter the customer's phone number.",
    );
  }

  type ProcessedItem = {
    variationId: string;
    subVariationId: string | null;
    quantity: number;
    unitPrice: number;
    totalMrp: number;
    discountPercent: number;
    discountAmount: number;
    lineTotal: number;
  };

  const processedItems: ProcessedItem[] = [];
  let subtotal = 0;
  let totalDiscount = 0;

  for (const item of items) {
    const variation = await prisma.productVariation.findUnique({
      where: { id: item.variationId },
      include: {
        subVariations: { select: { id: true, name: true } },
        product: {
          include: {
            discounts: {
              where: {
                isActive: true,
                OR: [{ startDate: null }, { startDate: { lte: new Date() } }],
                AND: [
                  {
                    OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
                  },
                ],
              },
              include: { discountType: true },
            },
          },
        },
      },
    });

    if (!variation) {
      throw new SaleServiceError(
        404,
        `Product variation ${item.variationId} not found`,
      );
    }

    const hasSubVariants = variation.subVariations?.length > 0;
    const subVariationId = item.subVariationId ?? null;
    if (hasSubVariants && !subVariationId) {
      throw new SaleServiceError(
        400,
        `Variation ${variation.color} has sub-variants; please specify subVariationId for each line item`,
      );
    }
    if (!hasSubVariants && subVariationId) {
      throw new SaleServiceError(
        400,
        `Variation ${variation.color} has no sub-variants; do not send subVariationId`,
      );
    }
    if (subVariationId) {
      const belongs = variation.subVariations?.some(
        (s) => s.id === subVariationId,
      );
      if (!belongs) {
        throw new SaleServiceError(
          400,
          `Sub-variation ${subVariationId} does not belong to variation ${item.variationId}`,
        );
      }
    }

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
      throw new SaleServiceError(400, "Insufficient stock", {
        product: variation.product.name,
        variation: variation.color,
        available: availableStock,
        requested: item.quantity,
      });
    }

    const unitPrice = Number(variation.product.mrp);
    const itemSubtotal = unitPrice * item.quantity;
    let discountPercent = 0;
    let discountAmount = 0;

    const activeDiscounts = variation.product.discounts as Array<
      (typeof variation.product.discounts)[number] & {
        discountType: { name: string };
      }
    >;
    let baseDiscount: (typeof activeDiscounts)[number] | null = null;

    if (activeDiscounts && activeDiscounts.length > 0) {
      const eligible = activeDiscounts.filter((d) => {
        const typeName = d.discountType.name.toLowerCase();
        if (saleType === "MEMBER") {
          return typeName.includes("member") || typeName.includes("non-member");
        }
        return (
          typeName.includes("non-member") || typeName.includes("wholesale")
        );
      });

      if (eligible.length > 0) {
        eligible.sort((a, b) => {
          const aIsSpecial =
            a.discountType.name.toLowerCase() === "special" ? 1 : 0;
          const bIsSpecial =
            b.discountType.name.toLowerCase() === "special" ? 1 : 0;
          if (aIsSpecial !== bIsSpecial) return bIsSpecial - aIsSpecial;
          const aValue =
            a.valueType === "FLAT"
              ? Number(a.value)
              : (Number(a.value) / 100) * itemSubtotal;
          const bValue =
            b.valueType === "FLAT"
              ? Number(b.value)
              : (Number(b.value) / 100) * itemSubtotal;
          return bValue - aValue;
        });
        baseDiscount = eligible[0];
      }
    }

    if (baseDiscount) {
      if (baseDiscount.valueType === "FLAT") {
        discountAmount += Number(baseDiscount.value);
      } else {
        discountPercent += Number(baseDiscount.value);
      }
    }

    if (item.promoCode) {
      const promo = await prisma.promoCode.findFirst({
        where: { code: item.promoCode },
        include: {
          products: { include: { product: true } },
        },
      });

      if (promo && promo.isActive) {
        const now = new Date();
        if (
          (!promo.validFrom || promo.validFrom <= now) &&
          (!promo.validTo || promo.validTo >= now) &&
          (!promo.usageLimit || promo.usageCount < promo.usageLimit)
        ) {
          const isProductEligible = promo.products.some(
            (pp) => pp.productId === variation.productId,
          );
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
            let promoDiscountAmount = 0;
            if (promo.valueType === "FLAT") {
              promoDiscountAmount = Number(promo.value);
            } else {
              promoDiscountAmount =
                baseAfterProductDiscount * (Number(promo.value) / 100);
            }
            if (promo.overrideDiscounts) {
              discountAmount = promoDiscountAmount;
              discountPercent = 0;
            } else if (promo.allowStacking) {
              discountAmount += promoDiscountAmount;
            } else {
              const baseTotalDiscount =
                discountAmount + itemSubtotal * (discountPercent / 100);
              if (promoDiscountAmount > baseTotalDiscount) {
                discountAmount = promoDiscountAmount;
                discountPercent = 0;
              }
            }
            await prisma.promoCode.update({
              where: { id: promo.id },
              data: { usageCount: { increment: 1 } },
            });
          }
        }
      }
    }

    const effectiveDiscount =
      Math.min(
        itemSubtotal,
        discountAmount + itemSubtotal * (discountPercent / 100),
      ) || 0;
    const lineTotal = itemSubtotal - effectiveDiscount;

    subtotal += itemSubtotal;
    totalDiscount += effectiveDiscount;

    processedItems.push({
      variationId: item.variationId,
      subVariationId: subVariationId ?? null,
      quantity: item.quantity,
      unitPrice,
      totalMrp: itemSubtotal,
      discountPercent,
      discountAmount: effectiveDiscount,
      lineTotal,
    });
  }

  const total = Math.round((subtotal - totalDiscount) * 100) / 100;
  const creditSale = isCreditSale === true;

  if (!creditSale && payments && payments.length > 0) {
    const paymentSum =
      Math.round(
        payments.reduce((sum, p) => sum + Number(p.amount || 0), 0) * 100,
      ) / 100;
    if (Math.abs(paymentSum - total) > 0.01) {
      throw new SaleServiceError(
        400,
        "Sum of payment sources must match final total (after discounts)",
        { total, paymentSum },
      );
    }
  }

  const sale = await prisma.$transaction(async (tx) => {
    const newSale = await tx.sale.create({
      data: {
        tenantId,
        saleCode: generateSaleCode(),
        type: saleType,
        isCreditSale: creditSale,
        locationId,
        memberId: member?.id || null,
        subtotal,
        discount: totalDiscount,
        total,
        notes: notes || null,
        createdById: userId,
        items: {
          create: processedItems.map((item) => ({
            variationId: item.variationId,
            subVariationId: item.subVariationId ?? undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalMrp: item.totalMrp,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            lineTotal: item.lineTotal,
          })),
        },
        payments:
          payments && payments.length > 0
            ? {
                create: payments.map((p) => ({
                  method: p.method,
                  amount: p.amount,
                })),
              }
            : undefined,
      },
      include: {
        location: { select: { id: true, name: true } },
        member: { select: { id: true, phone: true, name: true } },
        createdBy: { select: { id: true, username: true } },
        items: {
          include: {
            variation: {
              include: {
                product: { select: { id: true, name: true, imsCode: true } },
              },
            },
            subVariation: { select: { id: true, name: true } },
          },
        },
        payments: true,
      },
    });

    for (const item of processedItems) {
      const inv =
        item.subVariationId != null
          ? await tx.locationInventory.findUnique({
              where: {
                locationId_variationId_subVariationId: {
                  locationId,
                  variationId: item.variationId,
                  subVariationId: item.subVariationId,
                },
              },
            })
          : await tx.locationInventory.findFirst({
              where: {
                locationId,
                variationId: item.variationId,
                subVariationId: null,
              },
            });
      if (!inv) {
        throw new Error(
          `Inventory not found for location ${locationId}, variation ${item.variationId}`,
        );
      }
      await tx.locationInventory.update({
        where: { id: inv.id },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    return newSale;
  });

  if (member) {
    try {
      await prisma.member.update({
        where: { id: member.id },
        data: {
          totalSales: { increment: total },
          memberSince: member.createdAt ?? new Date(),
          firstPurchase: member.firstPurchase ?? new Date(),
        },
      });
    } catch {
      // Non-fatal
    }
  }

  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: AuditAction.CREATE_SALE,
        resource: AuditResource.SALE,
        resourceId: sale.id,
        details: {
          saleCode: sale.saleCode,
          total: Number(sale.total),
          locationId: sale.locationId,
        },
        ip: auditMeta?.ip,
        userAgent: auditMeta?.userAgent,
      },
    });
  } catch {
    // Non-fatal
  }

  return sale;
}
