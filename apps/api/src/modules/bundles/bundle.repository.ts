import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

export interface BundleWhere {
  tenantId: string;
  deletedAt: null;
  active?: boolean;
  OR?: Array<
    | { name: { contains: string; mode: "insensitive" } }
    | { slug: { contains: string; mode: "insensitive" } }
  >;
}

export interface CreateBundleRepoData {
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  productIds: string[];
  pricingStrategy: "SUM" | "DISCOUNT_PCT" | "FIXED";
  discountPct: number | null;
  fixedPrice: number | null;
  active: boolean;
}

export interface UpdateBundleRepoData {
  name?: string;
  slug?: string;
  description?: string | null;
  productIds?: string[];
  pricingStrategy?: "SUM" | "DISCOUNT_PCT" | "FIXED";
  discountPct?: number | null;
  fixedPrice?: number | null;
  active?: boolean;
}

const bundleListSelect = {
  id: true,
  name: true,
  slug: true,
  productIds: true,
  pricingStrategy: true,
  discountPct: true,
  fixedPrice: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class BundleRepository {
  async findFirstBySlug(tenantId: string, slug: string) {
    const trimmed = slug.trim().toLowerCase();
    if (!trimmed) return null;
    return prisma.bundle.findFirst({
      where: { tenantId, slug: trimmed, deletedAt: null },
      select: { id: true, slug: true },
    });
  }

  async findById(tenantId: string, id: string) {
    return prisma.bundle.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findActiveBySlug(tenantId: string, slug: string) {
    const trimmed = slug.trim().toLowerCase();
    if (!trimmed) return null;
    return prisma.bundle.findFirst({
      where: { tenantId, slug: trimmed, active: true, deletedAt: null },
    });
  }

  async count(where: BundleWhere): Promise<number> {
    return prisma.bundle.count({ where });
  }

  async findMany(
    where: BundleWhere,
    orderBy: Record<string, "asc" | "desc">,
    skip: number,
    take: number,
  ) {
    return prisma.bundle.findMany({
      where,
      orderBy,
      skip,
      take,
      select: bundleListSelect,
    });
  }

  async create(data: CreateBundleRepoData) {
    return prisma.bundle.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        productIds: data.productIds,
        pricingStrategy: data.pricingStrategy,
        discountPct: data.discountPct,
        fixedPrice: data.fixedPrice,
        active: data.active,
      },
    });
  }

  async update(id: string, data: UpdateBundleRepoData) {
    return prisma.bundle.update({
      where: { id },
      data: data as Prisma.BundleUpdateInput,
    });
  }

  async softDelete(id: string) {
    return prisma.bundle.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    });
  }

  /** Dereference productIds → {id, name} for public detail view. Missing/soft-deleted filtered out but array order preserved. */
  async dereferenceProducts(tenantId: string, productIds: string[]) {
    if (productIds.length === 0) return [];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId, deletedAt: null },
      select: { id: true, name: true, finalSp: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return productIds.flatMap((id) => {
      const p = byId.get(id);
      return p ? [p] : [];
    });
  }
}

export default new BundleRepository();
