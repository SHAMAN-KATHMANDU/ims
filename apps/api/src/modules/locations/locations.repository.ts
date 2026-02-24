/**
 * Locations repository - database access for locations module.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const locationInclude = {
  _count: {
    select: {
      inventory: true,
      transfersFrom: true,
      transfersTo: true,
    },
  },
} as const;

export const locationsRepository = {
  findLocationByName(tenantId: string, name: string) {
    return prisma.location.findFirst({
      where: { tenantId, name },
    });
  },

  findLocationById(id: string) {
    return prisma.location.findUnique({
      where: { id },
      include: locationInclude,
    });
  },

  findLocationByIdWithTransferCounts(id: string) {
    return prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            inventory: true,
            transfersFrom: { where: { status: { not: "COMPLETED" } } },
            transfersTo: { where: { status: { not: "COMPLETED" } } },
          },
        },
      },
    });
  },

  findLocations(params: {
    where: Prisma.LocationWhereInput;
    orderBy: Prisma.LocationOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.location.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: locationInclude,
    });
  },

  countLocations(where: Prisma.LocationWhereInput) {
    return prisma.location.count({ where });
  },

  countActiveWarehouses(tenantId: string) {
    return prisma.location.count({
      where: {
        tenantId,
        type: "WAREHOUSE",
        isActive: true,
      },
    });
  },

  createLocation(
    data: Prisma.LocationCreateInput | Prisma.LocationUncheckedCreateInput,
  ) {
    return prisma.location.create({
      data,
    });
  },

  updateLocation(id: string, data: Prisma.LocationUpdateInput) {
    return prisma.location.update({
      where: { id },
      data,
      include: locationInclude,
    });
  },

  unsetDefaultWarehouses(tenantId: string) {
    return prisma.location.updateMany({
      where: { tenantId, isDefaultWarehouse: true },
      data: { isDefaultWarehouse: false },
    });
  },

  unsetDefaultWarehousesExcept(tenantId: string, excludeId: string) {
    return prisma.location.updateMany({
      where: { tenantId, id: { not: excludeId } },
      data: { isDefaultWarehouse: false },
    });
  },

  softDeleteLocation(id: string) {
    return prisma.location.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  },

  findLocationInventory(params: {
    locationId: string;
    where?: Prisma.LocationInventoryWhereInput;
    skip: number;
    take: number;
    orderBy?: Prisma.LocationInventoryOrderByWithRelationInput;
  }) {
    return prisma.locationInventory.findMany({
      where: {
        locationId: params.locationId,
        ...params.where,
      },
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
      include: {
        variation: {
          include: {
            product: {
              select: {
                id: true,
                imsCode: true,
                name: true,
                category: true,
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
    });
  },

  countLocationInventory(where: Prisma.LocationInventoryWhereInput) {
    return prisma.locationInventory.count({ where });
  },
};
