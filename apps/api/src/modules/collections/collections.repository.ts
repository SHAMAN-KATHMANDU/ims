/**
 * Collections repository — Prisma queries for curated product groupings.
 *
 * Reads return the collection row plus a join-shape that the service
 * normalizes into `{ products: PublicSiteProduct[] }`. Product membership
 * is replaced in one transaction so reordering is atomic.
 */

import type { Collection, Prisma } from "@prisma/client";
import prisma from "@/config/prisma";

export type CollectionRow = Collection;

export class CollectionsRepository {
  list(tenantId: string): Promise<CollectionRow[]> {
    return prisma.collection.findMany({
      where: { tenantId },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    });
  }

  findById(tenantId: string, id: string): Promise<CollectionRow | null> {
    return prisma.collection.findFirst({ where: { id, tenantId } });
  }

  findBySlug(tenantId: string, slug: string): Promise<CollectionRow | null> {
    return prisma.collection.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    });
  }

  create(
    tenantId: string,
    data: {
      slug: string;
      title: string;
      subtitle?: string;
      sort?: number;
      isActive?: boolean;
    },
  ): Promise<CollectionRow> {
    return prisma.collection.create({
      data: {
        tenantId,
        slug: data.slug,
        title: data.title,
        subtitle: data.subtitle ?? null,
        sort: data.sort ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  /**
   * Tenant isolation is enforced by the service (which does a
   * findById-by-tenant before calling this), matching the pattern
   * used across the repo layer. Prisma's `update`/`delete` require a
   * unique where clause and reject compound filters.
   */
  update(
    _tenantId: string,
    id: string,
    patch: Prisma.CollectionUpdateInput,
  ): Promise<CollectionRow> {
    return prisma.collection.update({
      where: { id },
      data: patch,
    });
  }

  delete(_tenantId: string, id: string): Promise<void> {
    return prisma.collection.delete({ where: { id } }).then(() => undefined);
  }

  /**
   * Replace a collection's product membership in order. Runs in a
   * transaction so a half-written swap can't leave the list split.
   * Invalid productIds (soft-deleted or other-tenant) are filtered
   * server-side before the swap so the endpoint returns successfully
   * with just the valid subset.
   */
  async setProducts(
    tenantId: string,
    collectionId: string,
    productIds: string[],
  ): Promise<{ accepted: string[]; skipped: string[] }> {
    const accepted: string[] = [];
    const skipped: string[] = [];
    if (productIds.length > 0) {
      const validRows = await prisma.product.findMany({
        where: {
          tenantId,
          deletedAt: null,
          id: { in: productIds },
        },
        select: { id: true },
      });
      const validSet = new Set(validRows.map((r) => r.id));
      for (const id of productIds) {
        if (validSet.has(id)) accepted.push(id);
        else skipped.push(id);
      }
    }

    await prisma.$transaction([
      prisma.productCollection.deleteMany({ where: { collectionId } }),
      ...(accepted.length > 0
        ? [
            prisma.productCollection.createMany({
              data: accepted.map((productId, idx) => ({
                collectionId,
                productId,
                position: idx,
              })),
            }),
          ]
        : []),
    ]);

    return { accepted, skipped };
  }

  async listProductIds(collectionId: string): Promise<string[]> {
    const rows = await prisma.productCollection.findMany({
      where: { collectionId },
      orderBy: { position: "asc" },
      select: { productId: true },
    });
    return rows.map((r) => r.productId);
  }
}

export default new CollectionsRepository();
