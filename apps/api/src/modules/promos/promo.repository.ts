import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const promoInclude = {
  products: {
    include: {
      product: {
        select: { id: true, name: true },
      },
    },
  },
} as const;

export interface PromoWhere {
  tenantId: string;
  deletedAt: null;
  id?: string;
  isActive?: boolean;
  OR?: Array<
    | { code: { contains: string; mode: "insensitive" } }
    | { description: { contains: string; mode: "insensitive" } }
  >;
}

export interface CreatePromoRepoData {
  tenantId: string;
  code: string;
  description: string | null;
  valueType: "PERCENTAGE" | "FLAT";
  value: number;
  overrideDiscounts: boolean;
  allowStacking: boolean;
  eligibility: string;
  validFrom: Date | null;
  validTo: Date | null;
  usageLimit: number | null;
  isActive: boolean;
  productIds: string[];
}

export interface UpdatePromoRepoData {
  code?: string;
  description?: string | null;
  valueType?: "PERCENTAGE" | "FLAT";
  value?: number;
  overrideDiscounts?: boolean;
  allowStacking?: boolean;
  eligibility?: string;
  validFrom?: Date | null;
  validTo?: Date | null;
  usageLimit?: number | null;
  isActive?: boolean;
}

export interface ResolveTargetProductIdsParams {
  tenantId: string;
  applyToAll?: boolean;
  categoryIds?: string[];
  subCategories?: string[];
  explicitProductIds?: string[];
}

export class PromoRepository {
  async findFirstByCode(tenantId: string, code: string) {
    return prisma.promoCode.findFirst({
      where: { tenantId, code, deletedAt: null },
    });
  }

  async findById(tenantId: string, id: string) {
    return prisma.promoCode.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: promoInclude,
    });
  }

  async findByIdForUpdate(tenantId: string, id: string) {
    return prisma.promoCode.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async count(where: PromoWhere): Promise<number> {
    return prisma.promoCode.count({ where });
  }

  async findMany(
    where: PromoWhere,
    orderBy: Record<string, "asc" | "desc">,
    skip: number,
    take: number,
  ) {
    return prisma.promoCode.findMany({
      where,
      orderBy,
      skip,
      take,
      include: promoInclude,
    });
  }

  async create(data: CreatePromoRepoData) {
    return prisma.promoCode.create({
      data: {
        tenantId: data.tenantId,
        code: data.code,
        description: data.description,
        valueType: data.valueType,
        value: data.value,
        overrideDiscounts: data.overrideDiscounts,
        allowStacking: data.allowStacking,
        eligibility: data.eligibility as
          | "ALL"
          | "MEMBER"
          | "NON_MEMBER"
          | "WHOLESALE",
        validFrom: data.validFrom,
        validTo: data.validTo,
        usageLimit: data.usageLimit,
        isActive: data.isActive,
        products:
          data.productIds.length > 0
            ? {
                create: data.productIds.map((productId) => ({ productId })),
              }
            : undefined,
      },
      include: promoInclude,
    });
  }

  async update(id: string, data: UpdatePromoRepoData) {
    return prisma.promoCode.update({
      where: { id },
      data: data as Prisma.PromoCodeUpdateInput,
      include: promoInclude,
    });
  }

  async updateAndReplaceProducts(
    id: string,
    data: UpdatePromoRepoData,
    productIds: string[],
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.promoCode.update({
        where: { id },
        data: data as Prisma.PromoCodeUpdateInput,
      });

      await tx.promoCodeProduct.deleteMany({
        where: { promoCodeId: id },
      });

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
        include: promoInclude,
      });
    });
  }

  async softDelete(
    id: string,
    data: { deletedBy: string; deleteReason?: string | null },
  ) {
    return prisma.promoCode.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: data.deletedBy,
        deleteReason: data.deleteReason ?? undefined,
      },
    });
  }

  async resolveTargetProductIds(
    params: ResolveTargetProductIdsParams,
  ): Promise<string[]> {
    const {
      tenantId,
      applyToAll,
      categoryIds,
      subCategories,
      explicitProductIds = [],
    } = params;

    const ids = new Set<string>(explicitProductIds);

    if (applyToAll) {
      const allProducts = await prisma.product.findMany({
        where: { tenantId },
        select: { id: true },
      });
      allProducts.forEach((p) => ids.add(p.id));
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
      const filteredProducts = await prisma.product.findMany({
        where: { tenantId, OR: orConditions },
        select: { id: true },
      });
      filteredProducts.forEach((p) => ids.add(p.id));
    }

    return Array.from(ids);
  }
}

export default new PromoRepository();
