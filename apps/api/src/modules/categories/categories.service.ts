/**
 * Categories service - business logic for categories module.
 * Framework-independent; no req/res.
 */

import { categoriesRepository } from "./categories.repository";
import { NotFoundError } from "@/shared/errors";
import { getPrismaOrderBy } from "@/utils/pagination";

export type CreateCategoryInput = {
  tenantId: string;
  name: string;
  description?: string | null;
};

export type ListCategoriesParams = {
  tenantId: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  search?: string;
};

export type UpdateCategoryInput = {
  name?: string;
  description?: string | null;
};

export async function createCategory(input: CreateCategoryInput) {
  const existing = await categoriesRepository.findFirstByName(
    input.tenantId,
    input.name,
  );
  if (existing) {
    return {
      conflict: true as const,
      existingCategory: { id: existing.id, name: existing.name },
    };
  }
  const category = await categoriesRepository.create({
    tenantId: input.tenantId,
    name: input.name,
    description: input.description,
  });
  return { category };
}

export async function getAllCategories(params: ListCategoriesParams) {
  const allowedSortFields = ["id", "name", "createdAt", "updatedAt"];
  const orderBy = getPrismaOrderBy(
    params.sortBy,
    params.sortOrder,
    allowedSortFields,
  ) ?? { name: "asc" as const };

  const where: {
    tenantId: string;
    OR?: Array<{ name?: unknown; description?: unknown }>;
  } = {
    tenantId: params.tenantId,
  };
  if (params.search?.trim()) {
    const search = params.search.trim();
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (params.page - 1) * params.limit;

  const [totalItems, categories] = await Promise.all([
    categoriesRepository.count(where),
    categoriesRepository.findMany({
      where,
      orderBy,
      skip,
      take: params.limit,
    }),
  ]);

  return { categories, totalItems, page: params.page, limit: params.limit };
}

export async function getCategoryById(tenantId: string, id: string) {
  const category = await categoriesRepository.findUnique(id, tenantId);
  if (!category) {
    throw new NotFoundError("Category not found");
  }
  return category;
}

export async function getCategorySubcategories(
  tenantId: string,
  categoryId: string,
) {
  const category = await categoriesRepository.findUniqueForSubcategories(
    categoryId,
    tenantId,
  );
  if (!category) {
    throw new NotFoundError("Category not found");
  }
  const rows = await categoriesRepository.findSubcategoryNames(category.id);
  return { categoryId, subcategories: rows.map((r) => r.name) };
}

export async function createSubcategory(
  tenantId: string,
  categoryId: string,
  name: string,
) {
  const category = await categoriesRepository.findUniqueForSubcategories(
    categoryId,
    tenantId,
  );
  if (!category) {
    throw new NotFoundError("Category not found");
  }
  const existing = await categoriesRepository.findSubcategoryByCategoryAndName(
    categoryId,
    name,
  );
  if (existing) {
    return {
      conflict: true as const,
      subCategory: existing,
    };
  }
  const subCategory = await categoriesRepository.createSubcategory({
    name,
    categoryId,
  });
  return { subCategory };
}

export async function deleteSubcategory(
  tenantId: string,
  categoryId: string,
  name: string,
) {
  const category = await categoriesRepository.findUniqueForSubcategories(
    categoryId,
    tenantId,
  );
  if (!category) {
    throw new NotFoundError("Category not found");
  }
  const subCategory =
    await categoriesRepository.findSubcategoryByCategoryAndName(
      categoryId,
      name,
    );
  if (!subCategory) {
    throw new NotFoundError("Subcategory not found for this category");
  }
  const linkedProducts = await categoriesRepository.countProductsBySubcategory(
    subCategory.id,
  );
  if (linkedProducts > 0) {
    return {
      blocked: true as const,
      message: "Cannot delete subcategory that is linked to existing products",
    };
  }
  await categoriesRepository.softDeleteSubcategory(subCategory.id);
  return { deleted: true as const };
}

export async function updateCategory(
  tenantId: string,
  id: string,
  input: UpdateCategoryInput,
) {
  const existing = await categoriesRepository.findUnique(id, tenantId);
  if (!existing) {
    throw new NotFoundError("Category not found");
  }
  if (input.name !== undefined && input.name !== existing.name) {
    const nameExists = await categoriesRepository.findFirstByName(
      tenantId,
      input.name,
    );
    if (nameExists) {
      return {
        conflict: true as const,
        existingCategory: { id: nameExists.id, name: nameExists.name },
      };
    }
  }
  const updateData: { name?: string; description?: string | null } = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined)
    updateData.description = input.description ?? null;

  const category = await categoriesRepository.update(id, tenantId, updateData);
  return { category };
}

export async function deleteCategory(tenantId: string, id: string) {
  const existing = await categoriesRepository.findUnique(id, tenantId);
  if (!existing) {
    throw new NotFoundError("Category not found");
  }
  const productCount = existing._count?.products ?? 0;
  if (productCount > 0) {
    return {
      blocked: true as const,
      productCount,
      hint: "Please remove or reassign all products in this category before deleting",
    };
  }
  await categoriesRepository.softDelete(id, tenantId);
  return { deleted: true as const };
}
