/**
 * Product service — shared orchestration for product create/update.
 *
 * Used by:
 * - modules/products/products.service (createProduct: resolveCategory, resolveDiscounts, createProductWithInventory)
 * - modules/products/product.update.controller (upsertVariations)
 *
 * Kept as shared (not migrated into products module) so both products.service and
 * update controller use one place for category/discount resolution, product+inventory
 * creation, and variation upsert. Uses tenant-scoped prisma; call when tenant context is set.
 */

import { parseDate } from "@repo/shared";
import prisma from "@/config/prisma";
import { logger } from "@/config/logger";
import { AuditAction, AuditResource } from "@/shared/types";

export class ProductServiceError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public body?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ProductServiceError";
  }
}

// ----- Category resolution -----
export async function resolveCategory(
  tenantId: string,
  categoryIdentifier: string | undefined,
) {
  if (!categoryIdentifier) return null;
  let category = await prisma.category.findUnique({
    where: { id: categoryIdentifier },
  });
  if (!category) {
    category = await prisma.category.findFirst({
      where: { name: categoryIdentifier },
    });
  }
  if (!category) {
    const allCategories = await prisma.category.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });
    throw new ProductServiceError(404, "Category not found", {
      providedCategoryId: categoryIdentifier,
      hint: "You can use either category UUID or category name",
      availableCategories: allCategories.map((c) => ({
        id: c.id,
        name: c.name,
      })),
    });
  }
  return category;
}

// ----- Discount resolution (for create/update) -----
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DiscountInput = {
  discountTypeId?: string;
  discountTypeName?: string;
  discountPercentage: number;
  startDate?: string | Date;
  endDate?: string | Date;
  isActive?: boolean;
};

export type ResolvedDiscount = {
  discountTypeId: string;
  discountPercentage: number;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
};

export async function resolveDiscounts(
  tenantId: string,
  discounts: DiscountInput[] | undefined,
): Promise<ResolvedDiscount[]> {
  if (!discounts || !Array.isArray(discounts)) return [];
  const allDiscountTypes = await prisma.discountType.findMany({
    where: { tenantId },
    select: { id: true, name: true },
  });
  const resolved: ResolvedDiscount[] = [];
  for (const discount of discounts) {
    let discountType = null;
    if (discount.discountTypeId) {
      discountType = await prisma.discountType.findFirst({
        where: { id: discount.discountTypeId, tenantId },
      });
    }
    if (!discountType && discount.discountTypeName) {
      discountType = await prisma.discountType.findFirst({
        where: { name: discount.discountTypeName, tenantId },
      });
    }
    if (
      !discountType &&
      discount.discountTypeId &&
      !UUID_REGEX.test(discount.discountTypeId)
    ) {
      discountType = await prisma.discountType.findFirst({
        where: { name: discount.discountTypeId, tenantId },
      });
    }
    if (!discountType) {
      throw new ProductServiceError(404, "Discount type not found", {
        providedDiscountTypeId: discount.discountTypeId,
        providedDiscountTypeName: discount.discountTypeName,
        hint: "You can use either discountTypeId (UUID) or discountTypeName (string like 'Normal', 'Member', etc.)",
        availableDiscountTypes: allDiscountTypes.map((dt) => ({
          id: dt.id,
          name: dt.name,
        })),
      });
    }
    const startDate = discount.startDate
      ? discount.startDate instanceof Date
        ? discount.startDate
        : parseDate(discount.startDate)?.toJSDate() || null
      : null;
    const endDate = discount.endDate
      ? discount.endDate instanceof Date
        ? discount.endDate
        : parseDate(discount.endDate)?.toJSDate() || null
      : null;
    resolved.push({
      discountTypeId: discountType.id,
      discountPercentage: parseFloat(discount.discountPercentage.toString()),
      startDate,
      endDate,
      isActive: discount.isActive !== undefined ? discount.isActive : true,
    });
  }
  return resolved;
}

// ----- Create product with inventory and audit -----
export type CreateProductData = {
  imsCode: string;
  name: string;
  categoryId: string;
  description?: string;
  subCategory?: string;
  length?: number;
  breadth?: number;
  height?: number;
  weight?: number;
  costPrice: number;
  mrp: number;
  locationId: string;
  vendorId?: string;
  variations?: Array<{
    color: string;
    stockQuantity?: number;
    photos?: Array<{ photoUrl: string; isPrimary?: boolean }>;
    subVariants?: Array<string | { name: string }>;
  }>;
  resolvedDiscounts: ResolvedDiscount[];
};

export async function createProductWithInventory(
  data: CreateProductData,
  userId: string,
  tenantId: string,
  auditMeta?: { ip?: string; userAgent?: string },
) {
  const trimmedImsCode = data.imsCode.trim();
  const existingByImsCode = await prisma.product.findFirst({
    where: { tenantId, imsCode: trimmedImsCode },
  });
  if (existingByImsCode) {
    throw new ProductServiceError(
      409,
      "Product with this IMS code already exists",
    );
  }

  const resolvedLocation = await prisma.location.findFirst({
    where: { id: data.locationId, tenantId, isActive: true },
    select: { id: true },
  });
  if (!resolvedLocation) {
    throw new ProductServiceError(
      400,
      "Product creation failed: the selected location is invalid, inactive, or does not belong to your tenant.",
    );
  }

  const product = await prisma.product.create({
    data: {
      tenantId,
      imsCode: trimmedImsCode,
      name: data.name,
      categoryId: data.categoryId,
      locationId: resolvedLocation.id,
      description: data.description || null,
      subCategory: data.subCategory?.trim() || null,
      length: data.length ?? null,
      breadth: data.breadth ?? null,
      height: data.height ?? null,
      weight: data.weight ?? null,
      costPrice: data.costPrice,
      mrp: data.mrp,
      vendorId: data.vendorId || null,
      createdById: userId,
      variations:
        data.variations && Array.isArray(data.variations)
          ? {
              create: data.variations.map((variation: any) => ({
                color: variation.color,
                stockQuantity: variation.stockQuantity || 0,
                photos:
                  variation.photos && Array.isArray(variation.photos)
                    ? {
                        create: variation.photos.map((photo: any) => ({
                          photoUrl: photo.photoUrl,
                          isPrimary: photo.isPrimary || false,
                        })),
                      }
                    : undefined,
                subVariations:
                  variation.subVariants && Array.isArray(variation.subVariants)
                    ? {
                        create: variation.subVariants
                          .map((n: string | { name: string }) =>
                            typeof n === "string"
                              ? n.trim()
                              : ((n as any)?.name?.trim() ?? ""),
                          )
                          .filter(Boolean)
                          .map((name: string) => ({ name })),
                      }
                    : undefined,
              })),
            }
          : undefined,
      discounts:
        data.resolvedDiscounts.length > 0
          ? {
              create: data.resolvedDiscounts.map((d) => ({
                discountTypeId: d.discountTypeId,
                discountPercentage: d.discountPercentage,
                startDate: d.startDate,
                endDate: d.endDate,
                isActive: d.isActive,
              })),
            }
          : undefined,
    },
    include: {
      category: true,
      location: { select: { id: true, name: true, type: true } },
      createdBy: { select: { id: true, username: true, role: true } },
      variations: { include: { photos: true, subVariations: true } },
      discounts: { include: { discountType: true } },
    },
  });

  try {
    if (product.variations?.length) {
      for (const v of product.variations) {
        const hasSubVariants =
          Array.isArray((v as any).subVariations) &&
          (v as any).subVariations.length > 0;
        if (hasSubVariants) continue;
        const qty = Math.max(0, Number(v.stockQuantity) || 0);
        const existing = await prisma.locationInventory.findFirst({
          where: {
            locationId: product.locationId,
            variationId: v.id,
            subVariationId: null,
          },
        });
        if (existing) {
          await prisma.locationInventory.update({
            where: { id: existing.id },
            data: { quantity: { increment: qty } },
          });
        } else {
          await prisma.locationInventory.create({
            data: {
              locationId: product.locationId,
              variationId: v.id,
              subVariationId: null,
              quantity: qty,
            },
          });
        }
      }
    }
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: AuditAction.CREATE_PRODUCT,
        resource: AuditResource.PRODUCT,
        resourceId: product.id,
        details: { imsCode: product.imsCode, name: product.name },
        ip: auditMeta?.ip,
        userAgent: auditMeta?.userAgent,
      },
    });
  } catch (postCreateErr) {
    logger.error(
      "Post-create step failed (inventory link or audit log)",
      postCreateErr,
    );
  }
  return product;
}

// ----- Upsert variations (update product) -----
export type VariationInput = {
  color: string;
  stockQuantity?: number;
  photos?: Array<{ photoUrl: string; isPrimary?: boolean }>;
  subVariants?: Array<string | { name: string }>;
};

export async function upsertVariations(
  productId: string,
  variations: VariationInput[] | undefined,
) {
  if (variations === undefined) return;
  const existingVariations = await prisma.productVariation.findMany({
    where: { productId },
    include: {
      subVariations: true,
      _count: { select: { saleItems: true, transferItems: true } },
    },
  });
  const incomingColors = new Set(
    Array.isArray(variations)
      ? variations.map((v: any) => (v.color || "").trim()).filter(Boolean)
      : [],
  );

  for (const existing of existingVariations) {
    const hasDependents =
      (existing._count?.saleItems ?? 0) > 0 ||
      (existing._count?.transferItems ?? 0) > 0;
    if (incomingColors.has(existing.color)) {
      const payload = variations.find(
        (v: any) => (v.color || "").trim() === existing.color,
      );
      if (payload) {
        const newPhotos =
          payload.photos && Array.isArray(payload.photos)
            ? payload.photos.map((p: any) => ({
                photoUrl: p.photoUrl,
                isPrimary: p.isPrimary || false,
              }))
            : [];
        if (newPhotos.length > 0) {
          await prisma.variationPhoto.deleteMany({
            where: { variationId: existing.id },
          });
        }
        const incomingSubArr =
          payload.subVariants && Array.isArray(payload.subVariants)
            ? payload.subVariants
                .map((s: string | { name: string }) =>
                  typeof s === "string" ? s.trim() : (s?.name ?? "").trim(),
                )
                .filter((x: unknown): x is string => Boolean(x))
            : [];
        const incomingSubNames = new Set<string>(incomingSubArr);
        const existingSubs = existing.subVariations ?? [];
        for (const sub of existingSubs) {
          if (!incomingSubNames.has(sub.name)) {
            const subDependents =
              (await prisma.locationInventory.count({
                where: { subVariationId: sub.id },
              })) +
              (await prisma.saleItem.count({
                where: { subVariationId: sub.id },
              })) +
              (await prisma.transferItem.count({
                where: { subVariationId: sub.id },
              }));
            if (subDependents === 0) {
              await prisma.productSubVariation.delete({
                where: { id: sub.id },
              });
            }
          }
        }
        for (const name of incomingSubNames) {
          const exists = existingSubs.some((s) => s.name === name);
          if (!exists) {
            await prisma.productSubVariation.create({
              data: { variationId: existing.id, name },
            });
          }
        }
        await prisma.productVariation.update({
          where: { id: existing.id },
          data: {
            stockQuantity: payload.stockQuantity ?? existing.stockQuantity,
            ...(newPhotos.length > 0 ? { photos: { create: newPhotos } } : {}),
          },
        });
      }
    } else if (!hasDependents) {
      await prisma.productVariation.delete({ where: { id: existing.id } });
    }
  }

  for (const variation of Array.isArray(variations) ? variations : []) {
    const color = (variation.color || "").trim();
    if (!color || existingVariations.some((e) => e.color === color)) continue;
    await prisma.productVariation.create({
      data: {
        productId,
        color,
        stockQuantity: variation.stockQuantity || 0,
        photos:
          variation.photos && Array.isArray(variation.photos)
            ? {
                create: variation.photos.map((p: any) => ({
                  photoUrl: p.photoUrl,
                  isPrimary: p.isPrimary || false,
                })),
              }
            : undefined,
        subVariations:
          variation.subVariants && Array.isArray(variation.subVariants)
            ? {
                create: variation.subVariants
                  .map((n: string | { name: string }) =>
                    typeof n === "string" ? n.trim() : (n?.name ?? "").trim(),
                  )
                  .filter(Boolean)
                  .map((name: string) => ({ name })),
              }
            : undefined,
      },
    });
  }
}
