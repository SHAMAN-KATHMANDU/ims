/**
 * Promos service - business logic for promos module.
 */

import type { Prisma } from "@prisma/client";
import { NotFoundError } from "@/shared/errors";
import { AppError } from "@/shared/errors";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { promosRepository } from "./promos.repository";

const ALLOWED_SORT_FIELDS = [
  "code",
  "createdAt",
  "updatedAt",
  "validFrom",
  "validTo",
] as const;

export interface PromoListFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isActive?: boolean;
}

export interface CreatePromoInput {
  code: string;
  description?: string | null;
  valueType: string;
  value: number | string;
  overrideDiscounts?: boolean;
  allowStacking?: boolean;
  eligibility?: string;
  validFrom?: string | Date | null;
  validTo?: string | Date | null;
  usageLimit?: number | null;
  isActive?: boolean;
  productIds?: string[];
  applyToAll?: boolean;
  categoryIds?: string[];
  subCategories?: string[];
}

export interface UpdatePromoInput {
  code?: string;
  description?: string | null;
  valueType?: string;
  value?: number | string;
  overrideDiscounts?: boolean;
  allowStacking?: boolean;
  eligibility?: string;
  validFrom?: string | Date | null;
  validTo?: string | Date | null;
  usageLimit?: number | null;
  isActive?: boolean;
  productIds?: string[];
  applyToAll?: boolean;
  categoryIds?: string[];
  subCategories?: string[];
}

export const promosService = {
  async create(tenantId: string, input: CreatePromoInput) {
    const existing = await promosRepository.findPromoByCode(
      tenantId,
      input.code,
    );
    if (existing) {
      throw new AppError("Promo code with this code already exists", 409);
    }

    const resolvedProductIds = await promosRepository.findProductIdsForPromo(
      tenantId,
      {
        applyToAll: input.applyToAll,
        categoryIds: input.categoryIds,
        subCategories: input.subCategories,
        explicitProductIds: Array.isArray(input.productIds)
          ? input.productIds
          : [],
      },
    );

    return promosRepository.createPromo({
      tenant: { connect: { id: tenantId } },
      code: input.code,
      description: input.description ?? null,
      valueType: input.valueType as any,
      value: input.value,
      overrideDiscounts: !!input.overrideDiscounts,
      allowStacking: !!input.allowStacking,
      eligibility: (input.eligibility as any) ?? "ALL",
      validFrom: input.validFrom ? new Date(input.validFrom) : null,
      validTo: input.validTo ? new Date(input.validTo) : null,
      usageLimit: input.usageLimit !== undefined ? input.usageLimit : null,
      isActive: input.isActive !== undefined ? !!input.isActive : true,
      products:
        resolvedProductIds.length > 0
          ? {
              create: resolvedProductIds.map((productId) => ({ productId })),
            }
          : undefined,
    });
  },

  async getAll(tenantId: string, filters: PromoListFilters) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(filters);
    const { isActive } = filters;

    const orderBy = getPrismaOrderBy(sortBy, sortOrder, [
      ...ALLOWED_SORT_FIELDS,
    ]) ?? {
      createdAt: "desc",
    };

    const where: Prisma.PromoCodeWhereInput = { tenantId };
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (isActive !== undefined) where.isActive = isActive;

    const skip = (page - 1) * limit;
    const [totalItems, promos] = await Promise.all([
      promosRepository.countPromos(where),
      promosRepository.findPromos({ where, orderBy, skip, take: limit }),
    ]);

    return createPaginationResult(promos, totalItems, page, limit);
  },

  async getById(id: string, tenantId: string) {
    const promo = await promosRepository.findPromoById(id, tenantId);
    if (!promo) throw new NotFoundError("Promo code not found");
    return promo;
  },

  async update(id: string, tenantId: string, input: UpdatePromoInput) {
    const existing = await promosRepository.findPromoById(id, tenantId);
    if (!existing) throw new NotFoundError("Promo code not found");

    const data: Prisma.PromoCodeUpdateInput = {};
    if (input.code !== undefined) data.code = input.code;
    if (input.description !== undefined)
      data.description = input.description ?? null;
    if (input.valueType !== undefined) data.valueType = input.valueType as any;
    if (input.value !== undefined) data.value = input.value;
    if (input.overrideDiscounts !== undefined)
      data.overrideDiscounts = !!input.overrideDiscounts;
    if (input.allowStacking !== undefined)
      data.allowStacking = !!input.allowStacking;
    if (input.eligibility !== undefined)
      data.eligibility = input.eligibility as any;
    if (input.validFrom !== undefined)
      data.validFrom = input.validFrom ? new Date(input.validFrom) : null;
    if (input.validTo !== undefined)
      data.validTo = input.validTo ? new Date(input.validTo) : null;
    if (input.usageLimit !== undefined) data.usageLimit = input.usageLimit;
    if (input.isActive !== undefined) data.isActive = !!input.isActive;

    let resolvedProductIds: string[] | undefined;
    if (
      input.productIds !== undefined ||
      input.applyToAll !== undefined ||
      input.categoryIds !== undefined ||
      input.subCategories !== undefined
    ) {
      resolvedProductIds = await promosRepository.findProductIdsForPromo(
        tenantId,
        {
          applyToAll: input.applyToAll,
          categoryIds: input.categoryIds,
          subCategories: input.subCategories,
          explicitProductIds: Array.isArray(input.productIds)
            ? input.productIds
            : [],
        },
      );
    }

    if (resolvedProductIds !== undefined) {
      const promo = await promosRepository.updatePromoWithProducts(
        id,
        data,
        resolvedProductIds,
      );
      return promo!;
    }

    await promosRepository.updatePromo(id, data);
    const promo = await promosRepository.findPromoById(id, tenantId);
    return promo!;
  },

  async delete(id: string, tenantId: string) {
    const existing = await promosRepository.findPromoById(id, tenantId);
    if (!existing) throw new NotFoundError("Promo code not found");
    await promosRepository.softDeletePromo(id);
  },
};
