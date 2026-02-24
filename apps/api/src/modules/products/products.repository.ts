/**
 * Products repository - all database access for products module.
 * No business logic, no validation, Prisma only.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const productListInclude = {
  category: true,
  location: { select: { id: true, name: true, type: true } },
  vendor: { select: { id: true, name: true } },
  createdBy: {
    select: { id: true, username: true, role: true },
  },
  variations: {
    include: {
      photos: true,
      subVariations: { select: { id: true, name: true } },
      locationInventory: {
        select: {
          quantity: true,
          subVariationId: true,
          subVariation: { select: { id: true, name: true } },
          location: {
            select: { id: true, name: true, type: true },
          },
        },
      },
    },
  },
  discounts: { include: { discountType: true } },
} as const;

const productDetailInclude = {
  category: true,
  location: { select: { id: true, name: true, type: true } },
  createdBy: {
    select: { id: true, username: true, role: true },
  },
  variations: {
    include: {
      photos: true,
      subVariations: { select: { id: true, name: true } },
    },
  },
  discounts: { include: { discountType: true } },
} as const;

export const productsRepository = {
  findProduct(
    id: string,
    options?: {
      include?: typeof productDetailInclude;
      where?: Prisma.ProductWhereInput;
    },
  ) {
    return prisma.product.findFirst({
      where: options?.where ?? { id, deletedAt: null },
      include: options?.include ?? productDetailInclude,
    });
  },

  findProductById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: productDetailInclude,
    });
  },

  findProductByImsCode(tenantId: string, imsCode: string) {
    return prisma.product.findFirst({
      where: { tenantId, imsCode, deletedAt: null },
    });
  },

  findProducts(params: {
    where: Prisma.ProductWhereInput;
    orderBy: Prisma.ProductOrderByWithRelationInput;
    skip: number;
    take: number;
    include?: typeof productListInclude;
  }) {
    return prisma.product.findMany({
      where: { ...params.where, deletedAt: null },
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: params.include ?? productListInclude,
    });
  },

  countProducts(where: Prisma.ProductWhereInput) {
    return prisma.product.count({
      where: { ...where, deletedAt: null },
    });
  },

  createProduct(data: Prisma.ProductCreateInput) {
    return prisma.product.create({
      data,
      include: {
        category: true,
        location: { select: { id: true, name: true, type: true } },
        createdBy: { select: { id: true, username: true, role: true } },
        variations: {
          include: { photos: true, subVariations: true },
        },
        discounts: { include: { discountType: true } },
      },
    });
  },

  updateProduct(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        location: { select: { id: true, name: true, type: true } },
        createdBy: { select: { id: true, username: true, role: true } },
        variations: {
          include: { photos: true, subVariations: true },
        },
        discounts: { include: { discountType: true } },
      },
    });
  },

  softDeleteProduct(id: string) {
    return prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  findCategory(id: string) {
    return prisma.category.findUnique({ where: { id } });
  },

  findCategoryByTenant(id: string, tenantId: string) {
    return prisma.category.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
  },

  findCategoryByName(name: string) {
    return prisma.category.findFirst({ where: { name } });
  },

  findDiscountTypes(tenantId: string) {
    return prisma.discountType.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });
  },

  deleteProductDiscountsByProductId(productId: string) {
    return prisma.productDiscount.deleteMany({
      where: { productId },
    });
  },

  findCategories(tenantId: string, params?: { skip?: number; take?: number }) {
    return prisma.category.findMany({
      where: { tenantId },
      skip: params?.skip,
      take: params?.take,
      orderBy: { name: "asc" },
    });
  },

  countCategories(tenantId: string) {
    return prisma.category.count({ where: { tenantId } });
  },

  findVendor(id: string) {
    return prisma.vendor.findUnique({ where: { id } });
  },

  findLocation(id: string, tenantId?: string) {
    return prisma.location.findFirst({
      where: tenantId ? { id, tenantId, isActive: true } : { id },
      select: { id: true },
    });
  },

  getLowStockVariationIds(threshold: number = 5) {
    return prisma.locationInventory
      .groupBy({
        by: ["variationId"],
        _sum: { quantity: true },
      })
      .then((rows) =>
        rows
          .filter((r) => Number(r._sum?.quantity ?? 0) < threshold)
          .map((r) => r.variationId),
      );
  },

  findProductsForExport(tenantId: string, productIds?: string[]) {
    return prisma.product.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(productIds?.length ? { id: { in: productIds } } : {}),
      },
      include: {
        category: true,
        variations: { include: { photos: true } },
        discounts: { include: { discountType: true } },
      },
      orderBy: { dateCreated: "desc" },
    });
  },

  findProductDiscounts(params: {
    where: Prisma.ProductDiscountWhereInput;
    orderBy?:
      | Prisma.ProductDiscountOrderByWithRelationInput
      | Prisma.ProductDiscountOrderByWithRelationInput[];
    skip?: number;
    take?: number;
    include?: Prisma.ProductDiscountInclude;
  }) {
    return prisma.productDiscount.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: params.include ?? { discountType: true },
    });
  },

  countProductDiscounts(where: Prisma.ProductDiscountWhereInput) {
    return prisma.productDiscount.count({ where });
  },
};
