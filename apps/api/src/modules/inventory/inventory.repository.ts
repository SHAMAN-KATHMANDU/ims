/**
 * Inventory repository: all Prisma access for location inventory, product stock, adjust, set, summary.
 * All queries that need tenant scope receive where/ids from the service (service merges tenantId).
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const locationInventoryListInclude = {
  variation: {
    include: {
      product: {
        select: {
          id: true,
          imsCode: true,
          name: true,
          costPrice: true,
          mrp: true,
          category: {
            select: { id: true, name: true },
          },
        },
      },
      photos: {
        where: { isPrimary: true },
        take: 1,
      },
    },
  },
  subVariation: { select: { id: true, name: true } },
} as const;

export function findLocationById(id: string, tenantId?: string) {
  return prisma.location.findFirst({
    where: tenantId ? { id, tenantId } : { id },
    select: { id: true, name: true, type: true },
  });
}

export function findProductById(
  id: string,
  tenantId: string,
  include?: Prisma.ProductInclude,
) {
  return prisma.product.findFirst({
    where: { id, tenantId },
    include: include ?? {
      category: true,
      variations: {
        select: { id: true, color: true, stockQuantity: true },
      },
    },
  });
}

export function findVariationById(
  variationId: string,
  productTenantId?: string,
) {
  return prisma.productVariation.findFirst({
    where: productTenantId
      ? { id: variationId, product: { tenantId: productTenantId } }
      : { id: variationId },
    include: {
      product: {
        select: { id: true, imsCode: true, name: true, tenantId: true },
      },
    },
  });
}

export function findSubVariationByIdAndVariation(
  subVariationId: string,
  variationId: string,
) {
  return prisma.productSubVariation.findFirst({
    where: { id: subVariationId, variationId },
  });
}

export function countLocationInventory(
  where: Prisma.LocationInventoryWhereInput,
) {
  return prisma.locationInventory.count({ where });
}

export function findManyLocationInventory(
  where: Prisma.LocationInventoryWhereInput,
  opts: {
    skip: number;
    take: number;
    orderBy: Prisma.LocationInventoryOrderByWithRelationInput;
    include?: Prisma.LocationInventoryInclude;
  },
) {
  return prisma.locationInventory.findMany({
    where,
    skip: opts.skip,
    take: opts.take,
    orderBy: opts.orderBy,
    include: opts.include ?? locationInventoryListInclude,
  });
}

export function findUniqueLocationInventory(
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

export function updateLocationInventory(
  id: string,
  data: { quantity: number },
) {
  return prisma.locationInventory.update({
    where: { id },
    data,
  });
}

export function createLocationInventory(data: {
  locationId: string;
  variationId: string;
  subVariationId: string | null;
  quantity: number;
}) {
  return prisma.locationInventory.create({
    data: {
      locationId: data.locationId,
      variationId: data.variationId,
      subVariationId: data.subVariationId,
      quantity: data.quantity,
    },
  });
}

export function upsertLocationInventory(
  where: Prisma.LocationInventoryWhereUniqueInput,
  update: { quantity: number },
  create: Prisma.LocationInventoryUncheckedCreateInput,
) {
  return prisma.locationInventory.upsert({
    where,
    update,
    create,
  });
}

export function findLocationsActiveWithCount(tenantId: string) {
  return prisma.location.findMany({
    where: { tenantId, isActive: true },
    include: {
      _count: { select: { inventory: true } },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export function aggregateLocationInventoryByLocation(locationId: string) {
  return prisma.locationInventory.aggregate({
    where: { locationId },
    _sum: { quantity: true },
    _count: true,
  });
}

export function findLocationInventoryByProductId(productId: string) {
  return prisma.locationInventory.findMany({
    where: { variation: { productId } },
    include: {
      location: {
        select: { id: true, name: true, type: true },
      },
      variation: { select: { id: true, color: true } },
      subVariation: { select: { id: true, name: true } },
    },
    orderBy: [
      { location: { type: "asc" } },
      { location: { name: "asc" } },
      { variation: { color: "asc" } },
    ],
  });
}
