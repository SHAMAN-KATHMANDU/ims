import type { Prisma } from "@prisma/client";
import prisma, { basePrisma } from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import type { CreateCategoryDto, UpdateCategoryDto } from "./category.schema";

const ALLOWED_SORT_FIELDS = ["id", "name", "createdAt", "updatedAt"];

export class CategoryRepository {
  async findByName(tenantId: string, name: string) {
    return prisma.category.findFirst({ where: { tenantId, name } });
  }

  async findByNameExcluding(tenantId: string, name: string, excludeId: string) {
    return prisma.category.findFirst({
      where: { tenantId, name, id: { not: excludeId } },
    });
  }

  async create(tenantId: string, data: CreateCategoryDto) {
    return prisma.category.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description ?? null,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: ReturnType<typeof getPaginationParams>,
    filters?: { status?: string },
  ) {
    const { page, limit, sortBy, sortOrder, search } = query;

    const orderBy = getPrismaOrderBy(
      sortBy,
      sortOrder,
      ALLOWED_SORT_FIELDS,
    ) ?? {
      name: "asc" as const,
    };

    const where: Prisma.CategoryWhereInput = {
      tenantId,
    };

    // Status filter: active (non-deleted), inactive (soft-deleted), all (both)
    if (filters?.status === "active") {
      where.deletedAt = null;
    } else if (filters?.status === "inactive") {
      where.deletedAt = { not: null };
    }
    // status === "all" or undefined: use basePrisma to include soft-deleted

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;
    const includeDeleted =
      filters?.status !== "active" && filters?.status !== "inactive";

    const select = {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      subCategories: {
        where: { deletedAt: null },
        select: { name: true },
      },
      _count: {
        select: { products: { where: { deletedAt: null } } },
      },
    } as const;

    const [totalItems, categories] = includeDeleted
      ? await Promise.all([
          basePrisma.category.count({ where }),
          basePrisma.category.findMany({
            where,
            select,
            orderBy,
            skip,
            take: limit,
          }),
        ])
      : await Promise.all([
          prisma.category.count({ where }),
          prisma.category.findMany({
            where,
            select,
            orderBy,
            skip,
            take: limit,
          }),
        ]);

    return createPaginationResult(categories, totalItems, page, limit);
  }

  /** Find category by id and tenantId including soft-deleted (for restore flow). */
  async findByIdIncludingDeactivated(id: string, tenantId: string) {
    return basePrisma.category.findFirst({
      where: { id, tenantId },
      include: {
        products: {
          where: { deletedAt: null },
          select: { id: true, name: true, mrp: true, costPrice: true },
          take: 10,
        },
        _count: {
          select: { products: { where: { deletedAt: null } } },
        },
      },
    });
  }

  async findById(id: string, tenantId: string) {
    return prisma.category.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        products: {
          where: { deletedAt: null },
          select: { id: true, name: true, mrp: true, costPrice: true },
          take: 10,
        },
        _count: {
          select: { products: { where: { deletedAt: null } } },
        },
      },
    });
  }

  async findByIdWithProductCount(id: string, tenantId: string) {
    return prisma.category.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    });
  }

  async update(id: string, data: UpdateCategoryDto) {
    return prisma.category.update({ where: { id }, data });
  }

  async softDelete(
    id: string,
    data: { deletedBy: string; deleteReason?: string | null },
  ) {
    return prisma.category.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: data.deletedBy,
        deleteReason: data.deleteReason ?? undefined,
      },
    });
  }

  async restore(id: string) {
    return prisma.category.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
        deleteReason: null,
      },
    });
  }

  async findSubcategories(categoryId: string) {
    return prisma.subCategory.findMany({
      where: { categoryId, deletedAt: null },
      select: { name: true },
      orderBy: { name: "asc" },
    });
  }

  async findSubcategoryByName(categoryId: string, name: string) {
    return prisma.subCategory.findFirst({ where: { categoryId, name } });
  }

  async createSubcategory(categoryId: string, name: string) {
    return prisma.subCategory.create({ data: { name, categoryId } });
  }

  async countLinkedProducts(subCategoryId: string) {
    return prisma.product.count({ where: { subCategoryId } });
  }

  async softDeleteSubcategory(
    id: string,
    data: { deletedBy: string; deleteReason?: string | null },
  ) {
    return prisma.subCategory.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: data.deletedBy,
        deleteReason: data.deleteReason ?? undefined,
      },
    });
  }
}

export default new CategoryRepository();
