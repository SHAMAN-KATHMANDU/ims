import { randomUUID } from "node:crypto";
import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

function locationInventoryTenantWhere(
  tenantId: string | null,
  baseWhere: Prisma.LocationInventoryWhereInput = {},
): Prisma.LocationInventoryWhereInput {
  if (!tenantId) return baseWhere;
  return {
    ...baseWhere,
    location: {
      ...((baseWhere.location as object) ?? {}),
      tenantId,
    },
  } as Prisma.LocationInventoryWhereInput;
}

export interface GetLocationInventoryParams {
  locationId: string;
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  sortBy?: "name" | "price" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export class InventoryRepository {
  async findLocationById(locationId: string) {
    return prisma.location.findUnique({
      where: { id: locationId },
    });
  }

  async findProductById(productId: string) {
    return prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        variations: {
          select: {
            id: true,
            stockQuantity: true,
          },
        },
      },
    });
  }

  async findVariationById(variationId: string) {
    return prisma.productVariation.findUnique({
      where: { id: variationId },
      include: {
        product: {
          select: { id: true, name: true, imsCode: true },
        },
      },
    });
  }

  async findSubVariation(subVariationId: string, variationId: string) {
    return prisma.productSubVariation.findFirst({
      where: { id: subVariationId, variationId },
    });
  }

  async getLocationInventory(
    tenantId: string | null,
    params: GetLocationInventoryParams,
  ) {
    const {
      locationId,
      page,
      limit,
      search,
      categoryId,
      sortBy = "name",
      sortOrder = "asc",
    } = params;

    const variationWhere: Prisma.ProductVariationWhereInput = {
      // Always exclude inventory for soft-deleted products. A product that was
      // deleted and recreated (same ims_code) would otherwise surface both
      // copies' variations here — the cause of duplicate-looking rows in the
      // transfer "Add Multiple Products" picker. Matches the deletedAt: null
      // convention used across the product queries.
      product: { deletedAt: null },
    };

    if (search) {
      variationWhere.OR = [
        {
          product: {
            OR: [
              { imsCode: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    if (categoryId) {
      variationWhere.product = {
        ...((variationWhere.product as object) ?? {}),
        categoryId,
      } as Prisma.ProductWhereInput;
    }

    const where: Prisma.LocationInventoryWhereInput = {
      locationId,
      quantity: { gt: 0 },
      variation: variationWhere,
    };

    const skip = (page - 1) * limit;

    // Build orderBy based on sortBy parameter
    const orderBy: Prisma.LocationInventoryOrderByWithRelationInput = {};
    if (sortBy === "name") {
      Object.assign(orderBy, {
        variation: {
          product: { name: sortOrder },
        },
      });
    } else if (sortBy === "price") {
      Object.assign(orderBy, {
        variation: {
          product: { mrp: sortOrder },
        },
      });
    } else if (sortBy === "createdAt") {
      Object.assign(orderBy, {
        variation: {
          createdAt: sortOrder,
        },
      });
    }

    const [totalItems, inventory] = await Promise.all([
      prisma.locationInventory.count({
        where: locationInventoryTenantWhere(tenantId, where),
      }),
      prisma.locationInventory.findMany({
        where: locationInventoryTenantWhere(tenantId, where),
        skip,
        take: limit,
        include: {
          variation: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  costPrice: true,
                  mrp: true,
                  category: {
                    select: { id: true, name: true },
                  },
                  imsCode: true,
                },
              },
              attributes: {
                include: {
                  attributeType: { select: { name: true } },
                  attributeValue: { select: { value: true } },
                },
              },
              photos: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
          subVariation: { select: { id: true, name: true } },
        },
        orderBy,
      }),
    ]);

    return { totalItems, inventory };
  }

  async getProductStock(tenantId: string | null, productId: string) {
    return prisma.locationInventory.findMany({
      where: locationInventoryTenantWhere(tenantId, {
        variation: { productId },
      }),
      include: {
        location: {
          select: { id: true, name: true, type: true },
        },
        variation: {
          select: { id: true },
          include: {
            product: { select: { imsCode: true } },
          },
        },
        subVariation: { select: { id: true, name: true } },
      },
      orderBy: [
        { location: { type: "asc" } },
        { location: { name: "asc" } },
        { variation: { id: "asc" } },
      ],
    });
  }

  async findInventoryByUniqueKey(
    locationId: string,
    variationId: string,
    subVariationId: string | null,
  ) {
    // findFirst, not findUnique: Prisma 5.22 rejects a null component in the
    // compound-unique `where` (throws "subVariationId must not be null"), but
    // a plain equality filter matches a NULL sub_variation_id fine. The
    // (location, variation, sub-variation) tuple is still unique in the DB.
    return prisma.locationInventory.findFirst({
      where: {
        locationId,
        variationId,
        subVariationId,
      },
    });
  }

  async updateInventoryQuantity(id: string, quantity: number) {
    return prisma.locationInventory.update({
      where: { id },
      data: { quantity },
    });
  }

  async createInventory(
    locationId: string,
    variationId: string,
    subVariationId: string | null,
    quantity: number,
  ) {
    return prisma.locationInventory.create({
      data: {
        locationId,
        variationId,
        subVariationId,
        quantity,
      },
    });
  }

  async upsertInventory(
    locationId: string,
    variationId: string,
    subVariationId: string | null,
    quantity: number,
  ) {
    // Raw INSERT ... ON CONFLICT rather than prisma.locationInventory.upsert():
    // Prisma 5.22 rejects a null component in the compound-unique `where`
    // ("subVariationId must not be null") for a variation without
    // sub-variations. The conflict target is the (location_id, variation_id,
    // sub_variation_id) index, created NULLS NOT DISTINCT in migration
    // 20260601120000 so it matches a NULL sub_variation_id. inventory_id and
    // updated_at have no DB default; created_at rides CURRENT_TIMESTAMP. The
    // write is atomic; we re-read with findFirst to return the Prisma row the
    // caller expects ($executeRaw only yields an affected-row count).
    await prisma.$executeRaw`
      INSERT INTO "location_inventory"
        ("inventory_id", "location_id", "variation_id", "sub_variation_id", "quantity", "updated_at")
      VALUES
        (${randomUUID()}, ${locationId}, ${variationId}, ${subVariationId}, ${quantity}, now())
      ON CONFLICT ("location_id", "variation_id", "sub_variation_id")
      DO UPDATE SET "quantity" = EXCLUDED."quantity", "updated_at" = now()
    `;
    return prisma.locationInventory.findFirstOrThrow({
      where: { locationId, variationId, subVariationId },
    });
  }

  async getInventorySummary() {
    const locations = await prisma.location.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { inventory: true } },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    const locationStats = await Promise.all(
      locations.map(async (location) => {
        const stats = await prisma.locationInventory.aggregate({
          where: { locationId: location.id },
          _sum: { quantity: true },
          _count: true,
        });
        return {
          id: location.id,
          name: location.name,
          type: location.type,
          totalItems: stats._count,
          totalQuantity: stats._sum.quantity || 0,
        };
      }),
    );

    return { locations, locationStats };
  }
}

export default new InventoryRepository();
