/**
 * Public site repository — read-only queries for content served to unauth'd
 * website visitors. Uses tenant-scoped `prisma`; the resolveTenantFromHostname
 * middleware sets up the AsyncLocalStorage tenant context before handlers run,
 * so queries are auto-scoped. An explicit `tenantId` is also passed as a
 * belt-and-suspenders filter.
 *
 * Phase F.1: product reads now include a flat `photoUrl` field resolved from
 * the first active variation's primary photo (or oldest photo if none are
 * marked primary). The tenant-site renderer consumes this to replace the
 * imsCode placeholder with a real image. Photo lookup is a sub-query, not a
 * join, so the shape stays flat — templates don't have to drill into
 * `variations[0].photos[0].photoUrl`.
 */

import prisma from "@/config/prisma";
import type { Prisma, SiteConfig, SiteTemplate } from "@prisma/client";

export type PublicSiteConfig = SiteConfig & { template: SiteTemplate | null };

/** Shape of a product in a list response — flat, renderer-friendly. */
export interface PublicSiteProduct {
  id: string;
  name: string;
  description: string | null;
  imsCode: string;
  mrp: string;
  finalSp: string;
  categoryId: string;
  subCategory: string | null;
  dateCreated: Date;
  category: { id: string; name: string } | null;
  /** Primary variation photo resolved server-side, or null if none. */
  photoUrl: string | null;
}

export interface PublicSiteProductDetail extends PublicSiteProduct {
  length: Prisma.Decimal | null;
  breadth: Prisma.Decimal | null;
  height: Prisma.Decimal | null;
  weight: Prisma.Decimal | null;
  /** All available photos for gallery rendering (first = primary). */
  photoUrls: string[];
}

/**
 * Select clause for fetching the first active variation's primary photo.
 * Ordered by isPrimary DESC so a flagged primary wins; ties break by
 * upload date ASC so the oldest (and therefore stablest) photo shows.
 */
const FIRST_VARIATION_PHOTO_SELECT = {
  variations: {
    where: { isActive: true },
    orderBy: { createdAt: "asc" as const },
    take: 1,
    select: {
      photos: {
        orderBy: [
          { isPrimary: "desc" as const },
          { uploadDate: "asc" as const },
        ],
        take: 1,
        select: { photoUrl: true },
      },
    },
  },
} satisfies Prisma.ProductSelect;

/**
 * Extract the primary photo URL from a product that was loaded with the
 * `FIRST_VARIATION_PHOTO_SELECT` fragment. Returns null when the product
 * has no active variations OR the first active variation has no photos.
 */
function extractPhotoUrl(product: {
  variations: { photos: { photoUrl: string }[] }[];
}): string | null {
  const variation = product.variations[0];
  if (!variation) return null;
  const photo = variation.photos[0];
  return photo?.photoUrl ?? null;
}

export class PublicSiteRepository {
  findSiteConfig(tenantId: string): Promise<PublicSiteConfig | null> {
    return prisma.siteConfig.findUnique({
      where: { tenantId },
      include: { template: true },
    });
  }

  async listProducts(
    tenantId: string,
    opts: {
      page: number;
      limit: number;
      categoryId?: string;
      search?: string;
      sort?: "newest" | "price-asc" | "price-desc" | "name-asc";
      minPrice?: number;
      maxPrice?: number;
    },
  ): Promise<[PublicSiteProduct[], number]> {
    const finalSpFilter: Record<string, number> = {};
    if (opts.minPrice != null) finalSpFilter.gte = opts.minPrice;
    if (opts.maxPrice != null) finalSpFilter.lte = opts.maxPrice;

    const where: Prisma.ProductWhereInput = {
      tenantId,
      deletedAt: null,
      ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
      ...(opts.search
        ? { name: { contains: opts.search, mode: "insensitive" } }
        : {}),
      ...(Object.keys(finalSpFilter).length > 0
        ? { finalSp: finalSpFilter }
        : {}),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      opts.sort === "price-asc"
        ? [{ finalSp: "asc" }]
        : opts.sort === "price-desc"
          ? [{ finalSp: "desc" }]
          : opts.sort === "name-asc"
            ? [{ name: "asc" }]
            : [{ dateCreated: "desc" }];

    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        select: {
          id: true,
          name: true,
          description: true,
          imsCode: true,
          mrp: true,
          finalSp: true,
          categoryId: true,
          subCategory: true,
          dateCreated: true,
          category: { select: { id: true, name: true } },
          ...FIRST_VARIATION_PHOTO_SELECT,
        },
      }),
      prisma.product.count({ where }),
    ]);

    const products: PublicSiteProduct[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      imsCode: r.imsCode,
      mrp: r.mrp.toString(),
      finalSp: r.finalSp.toString(),
      categoryId: r.categoryId,
      subCategory: r.subCategory,
      dateCreated: r.dateCreated,
      category: r.category,
      photoUrl: extractPhotoUrl(r),
    }));
    return [products, total];
  }

  async findProduct(
    tenantId: string,
    id: string,
  ): Promise<PublicSiteProductDetail | null> {
    const row = await prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        imsCode: true,
        mrp: true,
        finalSp: true,
        length: true,
        breadth: true,
        height: true,
        weight: true,
        categoryId: true,
        subCategory: true,
        dateCreated: true,
        category: { select: { id: true, name: true } },
        // For the detail page we fetch the full photo set of the first
        // active variation so the renderer can show a gallery later. Also
        // keep the primary-first ordering from the list query.
        variations: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            photos: {
              orderBy: [{ isPrimary: "desc" }, { uploadDate: "asc" }],
              select: { photoUrl: true },
            },
          },
        },
      },
    });
    if (!row) return null;
    const variation = row.variations[0];
    const photoUrls = variation?.photos.map((p) => p.photoUrl) ?? [];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      imsCode: row.imsCode,
      mrp: row.mrp.toString(),
      finalSp: row.finalSp.toString(),
      length: row.length,
      breadth: row.breadth,
      height: row.height,
      weight: row.weight,
      categoryId: row.categoryId,
      subCategory: row.subCategory,
      dateCreated: row.dateCreated,
      category: row.category,
      photoUrl: photoUrls[0] ?? null,
      photoUrls,
    };
  }

  listCategories(tenantId: string) {
    return prisma.category.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    });
  }
}

export default new PublicSiteRepository();
