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
    const { locationId, page, limit, search, categoryId } = params;

    const variationWhere: Prisma.ProductVariationWhereInput = {};

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
      ...(Object.keys(variationWhere).length > 0
        ? { variation: variationWhere }
        : {}),
    };

    const skip = (page - 1) * limit;

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
        orderBy: {
          variation: {
            product: { name: "asc" },
          },
        },
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
    return prisma.locationInventory.findUnique({
      where: {
        locationId_variationId_subVariationId: {
          locationId,
          variationId,
          subVariationId,
        },
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
    return prisma.locationInventory.upsert({
      where: {
        locationId_variationId_subVariationId: {
          locationId,
          variationId,
          subVariationId,
        },
      },
      update: { quantity },
      create: {
        locationId,
        variationId,
        subVariationId,
        quantity,
      },
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
