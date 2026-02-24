/**
 * Categories repository - all database access for categories module.
 * No business logic, Prisma only.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const categoryListSelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  subCategories: { select: { name: true } },
  _count: { select: { products: true } },
} as const;

export const categoriesRepository = {
  findFirstByName(tenantId: string, name: string) {
    return prisma.category.findFirst({
      where: { tenantId, name, deletedAt: null },
    });
  },

  create(data: {
    tenantId: string;
    name: string;
    description?: string | null;
  }) {
    return prisma.category.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        description: data.description ?? null,
      },
    });
  },

  findMany(params: {
    where: Prisma.CategoryWhereInput;
    orderBy?: Prisma.CategoryOrderByWithRelationInput;
    skip: number;
    take: number;
    select?: typeof categoryListSelect;
  }) {
    return prisma.category.findMany({
      where: { ...params.where, deletedAt: null },
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      select: params.select ?? categoryListSelect,
    });
  },

  count(where: Prisma.CategoryWhereInput) {
    return prisma.category.count({
      where: { ...where, deletedAt: null },
    });
  },

  findUnique(id: string, tenantId: string) {
    return prisma.category.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        products: {
          select: {
            id: true,
            imsCode: true,
            name: true,
            mrp: true,
            costPrice: true,
          },
          take: 10,
        },
        _count: { select: { products: true } },
      },
    });
  },

  findUniqueForSubcategories(id: string, tenantId: string) {
    return prisma.category.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
  },

  update(id: string, tenantId: string, data: Prisma.CategoryUpdateInput) {
    return prisma.category.update({
      where: { id, tenantId },
      data,
    });
  },

  softDelete(id: string, tenantId: string) {
    return prisma.category.update({
      where: { id, tenantId },
      data: { deletedAt: new Date() },
    });
  },

  // SubCategory
  findSubcategoryNames(categoryId: string) {
    return prisma.subCategory.findMany({
      where: { categoryId, deletedAt: null },
      select: { name: true },
      orderBy: { name: "asc" },
    });
  },

  findSubcategoryByCategoryAndName(categoryId: string, name: string) {
    return prisma.subCategory.findFirst({
      where: { categoryId, name, deletedAt: null },
    });
  },

  createSubcategory(data: { name: string; categoryId: string }) {
    return prisma.subCategory.create({
      data: { name: data.name, categoryId: data.categoryId },
    });
  },

  findSubcategoryByIdAndCategory(subCategoryId: string, categoryId: string) {
    return prisma.subCategory.findFirst({
      where: { id: subCategoryId, categoryId },
    });
  },

  countProductsBySubcategory(subCategoryId: string) {
    return prisma.product.count({
      where: { subCategoryId },
    });
  },

  softDeleteSubcategory(id: string) {
    return prisma.subCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
