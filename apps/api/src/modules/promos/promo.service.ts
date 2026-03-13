import { createError } from "@/middlewares/errorHandler";
import { createDeleteAuditLog } from "@/shared/audit/createDeleteAuditLog";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import promoRepository, {
  type PromoRepository,
  type PromoWhere,
  type CreatePromoRepoData,
  type UpdatePromoRepoData,
} from "./promo.repository";
import type { CreatePromoDto, UpdatePromoDto } from "./promo.schema";

const ALLOWED_SORT_FIELDS = [
  "code",
  "createdAt",
  "updatedAt",
  "validFrom",
  "validTo",
] as const;

export class PromoService {
  constructor(private repo: PromoRepository) {}

  async create(tenantId: string, data: CreatePromoDto) {
    const existing = await this.repo.findFirstByCode(tenantId, data.code);
    if (existing) {
      throw createError("Promo code with this code already exists", 409);
    }

    const productIds = await this.repo.resolveTargetProductIds({
      tenantId,
      applyToAll: data.applyToAll,
      categoryIds: data.categoryIds,
      subCategories: data.subCategories,
      explicitProductIds: Array.isArray(data.productIds) ? data.productIds : [],
    });

    const repoData: CreatePromoRepoData = {
      tenantId,
      code: data.code,
      description: data.description ?? null,
      valueType: data.valueType,
      value: data.value,
      overrideDiscounts: data.overrideDiscounts,
      allowStacking: data.allowStacking,
      eligibility: data.eligibility,
      validFrom: data.validFrom ?? null,
      validTo: data.validTo ?? null,
      usageLimit: data.usageLimit ?? null,
      isActive: data.isActive,
      productIds,
    };

    return this.repo.create(repoData);
  }

  async findAll(tenantId: string, rawQuery: Record<string, unknown>) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(rawQuery);

    const isActive =
      typeof rawQuery.isActive === "string"
        ? rawQuery.isActive === "true"
        : undefined;

    const orderBy = getPrismaOrderBy(sortBy, sortOrder, [
      ...ALLOWED_SORT_FIELDS,
    ]) ?? {
      createdAt: "desc",
    };

    const where: PromoWhere = { tenantId, deletedAt: null };
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const skip = (page - 1) * limit;
    const [totalItems, promos] = await Promise.all([
      this.repo.count(where),
      this.repo.findMany(where, orderBy, skip, limit),
    ]);

    return createPaginationResult(promos, totalItems, page, limit);
  }

  async findById(tenantId: string, id: string) {
    return this.repo.findById(tenantId, id);
  }

  async findByCode(tenantId: string, code: string) {
    return this.repo.findActiveByCode(tenantId, code);
  }

  async update(tenantId: string, id: string, data: UpdatePromoDto) {
    const existing = await this.repo.findByIdForUpdate(tenantId, id);
    if (!existing) return null;

    if (data.code !== undefined && data.code !== existing.code) {
      const duplicate = await this.repo.findFirstByCode(tenantId, data.code);
      if (duplicate) {
        throw createError("Promo code with this code already exists", 409);
      }
    }

    const updateData: UpdatePromoRepoData = {};
    if (data.code !== undefined) updateData.code = data.code;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.valueType !== undefined) updateData.valueType = data.valueType;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.overrideDiscounts !== undefined)
      updateData.overrideDiscounts = data.overrideDiscounts;
    if (data.allowStacking !== undefined)
      updateData.allowStacking = data.allowStacking;
    if (data.eligibility !== undefined)
      updateData.eligibility = data.eligibility;
    if (data.validFrom !== undefined) updateData.validFrom = data.validFrom;
    if (data.validTo !== undefined) updateData.validTo = data.validTo;
    if (data.usageLimit !== undefined) updateData.usageLimit = data.usageLimit;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const productTargetingChanged =
      data.productIds !== undefined ||
      data.applyToAll !== undefined ||
      data.categoryIds !== undefined ||
      data.subCategories !== undefined;

    if (productTargetingChanged) {
      const productIds = await this.repo.resolveTargetProductIds({
        tenantId,
        applyToAll: data.applyToAll,
        categoryIds: data.categoryIds,
        subCategories: data.subCategories,
        explicitProductIds: Array.isArray(data.productIds)
          ? data.productIds
          : [],
      });
      return this.repo.updateAndReplaceProducts(id, updateData, productIds);
    }

    if (Object.keys(updateData).length === 0) {
      return this.repo.findById(tenantId, id);
    }
    return this.repo.update(id, updateData);
  }

  async delete(
    tenantId: string,
    id: string,
    ctx: { userId: string; reason?: string; ip?: string; userAgent?: string },
  ) {
    const existing = await this.repo.findByIdForUpdate(tenantId, id);
    if (!existing) return null;
    await this.repo.softDelete(id, {
      deletedBy: ctx.userId,
      deleteReason: ctx.reason ?? null,
    });
    await createDeleteAuditLog({
      userId: ctx.userId,
      tenantId,
      resource: "PromoCode",
      resourceId: id,
      deleteReason: ctx.reason ?? undefined,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return {};
  }
}

export default new PromoService(promoRepository);
