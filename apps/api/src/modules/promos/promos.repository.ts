/**
 * Promos repository - database access for promos module.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const promoWithProductsInclude = {
  products: {
    include: {
      product: {
        select: { id: true, name: true, imsCode: true },
      },
    },
  },
} as const;

export interface ResolveProductIdsParams {
  applyToAll?: boolean;
  categoryIds?: string[];
  subCategories?: string[];
  explicitProductIds?: string[];
}

export const promosRepository = {
  findPromoByCode(tenantId: string, code: string) {
    return prisma.promoCode.findFirst({
      where: { tenantId, code },
    });
  },

  findPromoById(id: string, tenantId?: string) {
    return prisma.promoCode.findFirst({
      where: tenantId ? { id, tenantId } : { id },
      include: promoWithProductsInclude,
    });
  },

  findPromos(params: {
    where: Prisma.PromoCodeWhereInput;
    orderBy: Prisma.PromoCodeOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.promoCode.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: promoWithProductsInclude,
    });
  },

  countPromos(where: Prisma.PromoCodeWhereInput) {
    return prisma.promoCode.count({ where });
  },

  createPromo(data: Prisma.PromoCodeCreateInput) {
    return prisma.promoCode.create({
      data,
      include: promoWithProductsInclude,
    });
  },

  updatePromo(id: string, data: Prisma.PromoCodeUpdateInput) {
    return prisma.promoCode.update({
      where: { id },
      data,
    });
  },

  /** Update promo and optionally replace product associations in a transaction. */
  async updatePromoWithProducts(
    id: string,
    data: Prisma.PromoCodeUpdateInput,
    productIds: string[],
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.promoCode.update({ where: { id }, data });
      await tx.promoCodeProduct.deleteMany({ where: { promoCodeId: id } });
      if (productIds.length > 0) {
        await tx.promoCodeProduct.createMany({
          data: productIds.map((productId) => ({
            promoCodeId: id,
            productId,
          })),
        });
      }
      return tx.promoCode.findUnique({
        where: { id },
        include: promoWithProductsInclude,
      });
    });
  },

  deletePromoProducts(promoCodeId: string) {
    return prisma.promoCodeProduct.deleteMany({
      where: { promoCodeId },
    });
  },

  createPromoProducts(promoCodeId: string, productIds: string[]) {
    if (productIds.length === 0) return Promise.resolve({ count: 0 });
    return prisma.promoCodeProduct.createMany({
      data: productIds.map((productId) => ({
        promoCodeId,
        productId,
      })),
    });
  },

  /** Resolve product IDs for promo targeting: applyToAll, categoryIds, subCategories, or explicit list. */
  async findProductIdsForPromo(
    tenantId: string,
    params: ResolveProductIdsParams,
  ): Promise<string[]> {
    const {
      applyToAll,
      categoryIds,
      subCategories,
      explicitProductIds = [],
    } = params;

    const ids = new Set<string>(explicitProductIds);

    if (applyToAll) {
      const all = await prisma.product.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true },
      });
      all.forEach((p) => ids.add(p.id));
      return Array.from(ids);
    }

    const orConditions: Prisma.ProductWhereInput[] = [];
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      orConditions.push({ categoryId: { in: categoryIds } });
    }
    if (Array.isArray(subCategories) && subCategories.length > 0) {
      orConditions.push({ subCategory: { in: subCategories } });
    }

    if (orConditions.length > 0) {
      const filtered = await prisma.product.findMany({
        where: { tenantId, deletedAt: null, OR: orConditions },
        select: { id: true },
      });
      filtered.forEach((p) => ids.add(p.id));
    }

    return Array.from(ids);
  },

  softDeletePromo(id: string) {
    return prisma.promoCode.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  },
};
