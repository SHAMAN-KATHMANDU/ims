import { createError } from "@/middlewares/errorHandler";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import bundleRepository, {
  type BundleRepository,
  type BundleWhere,
  type CreateBundleRepoData,
  type UpdateBundleRepoData,
} from "./bundle.repository";
import type { CreateBundleDto, UpdateBundleDto } from "./bundle.schema";

const ALLOWED_SORT_FIELDS = ["name", "slug", "createdAt", "updatedAt"] as const;

export class BundleService {
  constructor(private repo: BundleRepository) {}

  async create(tenantId: string, data: CreateBundleDto) {
    const existing = await this.repo.findFirstBySlug(tenantId, data.slug);
    if (existing) {
      throw createError("Bundle with this slug already exists", 409);
    }

    const repoData: CreateBundleRepoData = {
      tenantId,
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      productIds: data.productIds,
      pricingStrategy: data.pricingStrategy,
      discountPct: data.discountPct ?? null,
      fixedPrice: data.fixedPrice ?? null,
      active: data.active,
    };
    return this.repo.create(repoData);
  }

  async findAll(tenantId: string, rawQuery: Record<string, unknown>) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(rawQuery);

    const active =
      typeof rawQuery.active === "string"
        ? rawQuery.active === "true"
        : undefined;

    const orderBy = getPrismaOrderBy(sortBy, sortOrder, [
      ...ALLOWED_SORT_FIELDS,
    ]) ?? { createdAt: "desc" };

    const where: BundleWhere = { tenantId, deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }
    if (active !== undefined) where.active = active;

    const skip = (page - 1) * limit;
    const [totalItems, bundles] = await Promise.all([
      this.repo.count(where),
      this.repo.findMany(where, orderBy, skip, limit),
    ]);
    return createPaginationResult(bundles, totalItems, page, limit);
  }

  async findById(tenantId: string, id: string) {
    return this.repo.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, data: UpdateBundleDto) {
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) return null;

    if (data.slug !== undefined && data.slug !== existing.slug) {
      const duplicate = await this.repo.findFirstBySlug(tenantId, data.slug);
      if (duplicate && duplicate.id !== id) {
        throw createError("Bundle with this slug already exists", 409);
      }
    }

    const updateData: UpdateBundleRepoData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined)
      updateData.description = data.description ?? null;
    if (data.productIds !== undefined) updateData.productIds = data.productIds;
    if (data.pricingStrategy !== undefined)
      updateData.pricingStrategy = data.pricingStrategy;
    if (data.discountPct !== undefined)
      updateData.discountPct = data.discountPct ?? null;
    if (data.fixedPrice !== undefined)
      updateData.fixedPrice = data.fixedPrice ?? null;
    if (data.active !== undefined) updateData.active = data.active;

    if (Object.keys(updateData).length === 0) {
      return existing;
    }
    return this.repo.update(id, updateData);
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.repo.findById(tenantId, id);
    if (!existing) return null;
    await this.repo.softDelete(id);
    return {};
  }

  async findPublicBySlug(tenantId: string, slug: string) {
    const bundle = await this.repo.findActiveBySlug(tenantId, slug);
    if (!bundle) return null;
    const products = await this.repo.dereferenceProducts(
      tenantId,
      bundle.productIds,
    );
    return { bundle, products };
  }

  async findAllPublic(tenantId: string, rawQuery: Record<string, unknown>) {
    const { page, limit } = getPaginationParams(rawQuery);
    const where: BundleWhere = { tenantId, deletedAt: null, active: true };
    const skip = (page - 1) * limit;
    const [totalItems, bundles] = await Promise.all([
      this.repo.count(where),
      this.repo.findMany(where, { createdAt: "desc" }, skip, limit),
    ]);
    return createPaginationResult(bundles, totalItems, page, limit);
  }
}

export default new BundleService(bundleRepository);
