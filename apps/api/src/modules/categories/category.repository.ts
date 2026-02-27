import prisma from "@/config/prisma";
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
  ) {
    const { page, limit, sortBy, sortOrder, search } = query;

    const orderBy = getPrismaOrderBy(
      sortBy,
      sortOrder,
      ALLOWED_SORT_FIELDS,
    ) ?? {
      name: "asc" as const,
    };

    const where: Parameters<typeof prisma.category.findMany>[0]["where"] = {
      tenantId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [totalItems, categories] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          subCategories: {
            where: { deletedAt: null },
            select: { name: true },
          },
          _count: {
            select: { products: { where: { deletedAt: null } } },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return createPaginationResult(categories, totalItems, page, limit);
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

  async softDelete(id: string) {
    return prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
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

  async softDeleteSubcategory(id: string) {
    return prisma.subCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export default new CategoryRepository();
