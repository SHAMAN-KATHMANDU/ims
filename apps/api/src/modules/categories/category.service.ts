import { createError } from "@/middlewares/errorHandler";
import { logger } from "@/config/logger";
import automationService from "@/modules/automation/automation.service";
import { getPaginationParams } from "@/utils/pagination";
import { createDeleteAuditLog } from "@/shared/audit/createDeleteAuditLog";
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
      if (existing.deletedAt) {
        const restored = await this.repo.restore(existing.id);
        return { category: restored, restored: true };
      }
      const err = createError("Category with this name already exists", 409);
      (err as any).existingCategory = { id: existing.id, name: existing.name };
      throw err;
    }
    const category = await this.repo.create(tenantId, data);
    await automationService
      .publishDomainEvent({
        tenantId,
        eventName: "catalog.category.created",
        scopeType: "GLOBAL",
        entityType: "CATEGORY",
        entityId: category.id,
        dedupeKey: `category-created:${category.id}`,
        payload: {
          categoryId: category.id,
          name: category.name,
          description: category.description ?? null,
        },
      })
      .catch((error) => {
        logger.error("Automation event publishing failed", undefined, {
          tenantId,
          categoryId: category.id,
          eventName: "catalog.category.created",
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return { category, restored: false };
  }

  async findAll(tenantId: string, rawQuery: Record<string, unknown>) {
    const query = getPaginationParams(rawQuery);
    const status = (rawQuery.status as string | undefined) || "active";
    return this.repo.findAll(tenantId, query, { status });
  }

  async restore(id: string, tenantId: string) {
    const existing = await this.repo.findByIdIncludingDeactivated(id, tenantId);
    if (!existing) throw createError("Category not found", 404);
    if (!existing.deletedAt) {
      throw createError("Category is not deactivated", 400);
    }
    return this.repo.restore(id);
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

    const category = await this.repo.update(id, updateData);
    await automationService
      .publishDomainEvent({
        tenantId,
        eventName: "catalog.category.updated",
        scopeType: "GLOBAL",
        entityType: "CATEGORY",
        entityId: category.id,
        dedupeKey: `category-updated:${category.id}:${category.updatedAt.toISOString()}`,
        payload: {
          categoryId: category.id,
          name: category.name,
          description: category.description ?? null,
        },
      })
      .catch((error) => {
        logger.error("Automation event publishing failed", undefined, {
          tenantId,
          categoryId: category.id,
          eventName: "catalog.category.updated",
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return category;
  }

  async delete(
    id: string,
    tenantId: string,
    ctx: { userId: string; reason?: string; ip?: string; userAgent?: string },
  ) {
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

    await this.repo.softDelete(id, {
      deletedBy: ctx.userId,
      deleteReason: ctx.reason ?? null,
    });
    await createDeleteAuditLog({
      userId: ctx.userId,
      tenantId,
      resource: "Category",
      resourceId: id,
      deleteReason: ctx.reason ?? undefined,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
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

  async deleteSubcategory(
    categoryId: string,
    tenantId: string,
    data: DeleteSubcategoryDto,
    ctx: { userId: string; reason?: string; ip?: string; userAgent?: string },
  ) {
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

    await this.repo.softDeleteSubcategory(subCategory.id, {
      deletedBy: ctx.userId,
      deleteReason: ctx.reason ?? null,
    });
    await createDeleteAuditLog({
      userId: ctx.userId,
      tenantId,
      resource: "SubCategory",
      resourceId: subCategory.id,
      deleteReason: ctx.reason ?? undefined,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }
}

export default new CategoryService(categoryRepository);
