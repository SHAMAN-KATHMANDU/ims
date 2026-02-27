import { createError } from "@/middlewares/errorHandler";
import { getPaginationParams } from "@/utils/pagination";
import categoryRepository, { CategoryRepository } from "./category.repository";
import type {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateSubcategoryDto,
  DeleteSubcategoryDto,
} from "./category.schema";

export class CategoryService {
  constructor(private repo: CategoryRepository) {}

  async create(tenantId: string, data: CreateCategoryDto) {
    const existing = await this.repo.findByName(tenantId, data.name);
    if (existing) {
      const err = createError("Category with this name already exists", 409);
      (err as any).existingCategory = { id: existing.id, name: existing.name };
      throw err;
    }
    return this.repo.create(tenantId, data);
  }

  async findAll(tenantId: string, rawQuery: Record<string, unknown>) {
    const query = getPaginationParams(rawQuery);
    return this.repo.findAll(tenantId, query);
  }

  async findById(id: string, tenantId: string) {
    const category = await this.repo.findById(id, tenantId);
    if (!category) throw createError("Category not found", 404);
    return category;
  }

  async update(id: string, tenantId: string, data: UpdateCategoryDto) {
    const existing = await this.repo.findByIdWithProductCount(id, tenantId);
    if (!existing) throw createError("Category not found", 404);

    if (data.name && data.name !== existing.name) {
      const nameConflict = await this.repo.findByNameExcluding(
        tenantId,
        data.name,
        id,
      );
      if (nameConflict) {
        const err = createError("Category with this name already exists", 409);
        (err as any).existingCategory = {
          id: nameConflict.id,
          name: nameConflict.name,
        };
        throw err;
      }
    }

    const updateData: UpdateCategoryDto = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description ?? null;

    return this.repo.update(id, updateData);
  }

  async delete(id: string, tenantId: string) {
    const existing = await this.repo.findByIdWithProductCount(id, tenantId);
    if (!existing) throw createError("Category not found", 404);

    if (existing._count.products > 0) {
      const err = createError(
        "Cannot delete category with existing products",
        400,
      );
      (err as any).productCount = existing._count.products;
      throw err;
    }

    await this.repo.softDelete(id);
  }

  async getSubcategories(categoryId: string) {
    const rows = await this.repo.findSubcategories(categoryId);
    return rows.map((r) => r.name);
  }

  async createSubcategory(
    categoryId: string,
    tenantId: string,
    data: CreateSubcategoryDto,
  ) {
    const category = await this.repo.findById(categoryId, tenantId);
    if (!category) throw createError("Category not found", 404);

    const trimmedName = data.name.trim();
    const existing = await this.repo.findSubcategoryByName(
      categoryId,
      trimmedName,
    );
    if (existing) {
      const err = createError(
        "Subcategory with this name already exists for this category",
        409,
      );
      (err as any).subCategory = existing;
      throw err;
    }

    return this.repo.createSubcategory(categoryId, trimmedName);
  }

  async deleteSubcategory(categoryId: string, data: DeleteSubcategoryDto) {
    const trimmedName = data.name.trim();
    const subCategory = await this.repo.findSubcategoryByName(
      categoryId,
      trimmedName,
    );
    if (!subCategory) {
      throw createError("Subcategory not found for this category", 404);
    }

    const linkedCount = await this.repo.countLinkedProducts(subCategory.id);
    if (linkedCount > 0) {
      throw createError(
        "Cannot delete subcategory that is linked to existing products",
        400,
      );
    }

    await this.repo.softDeleteSubcategory(subCategory.id);
  }
}

export default new CategoryService(categoryRepository);
