/**
 * Vendors repository - database access for vendors module.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const vendorListSelect = {
  id: true,
  name: true,
  contact: true,
  phone: true,
  address: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { products: true } },
} as const;

export const vendorsRepository = {
  findVendorByName(tenantId: string, name: string) {
    return prisma.vendor.findFirst({
      where: { tenantId, name, deletedAt: null },
    });
  },

  findVendors(params: {
    where: Prisma.VendorWhereInput;
    orderBy: Prisma.VendorOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.vendor.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      select: vendorListSelect,
    });
  },

  countVendors(where: Prisma.VendorWhereInput) {
    return prisma.vendor.count({ where });
  },

  findVendorById(id: string, tenantId: string) {
    return prisma.vendor.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: vendorListSelect,
    });
  },

  findVendorByIdForUpdateOrDelete(id: string, tenantId: string) {
    return prisma.vendor.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { products: true } },
      },
    });
  },

  createVendor(data: Prisma.VendorCreateInput) {
    return prisma.vendor.create({
      data,
    });
  },

  updateVendor(id: string, data: Prisma.VendorUpdateInput) {
    return prisma.vendor.update({
      where: { id },
      data,
    });
  },

  softDeleteVendor(id: string) {
    return prisma.vendor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  findProductsByVendor(params: {
    where: Prisma.ProductWhereInput;
    skip: number;
    take: number;
  }) {
    return prisma.product.findMany({
      where: params.where,
      select: {
        id: true,
        imsCode: true,
        name: true,
        mrp: true,
        costPrice: true,
      },
      orderBy: { name: "asc" as const },
      skip: params.skip,
      take: params.take,
    });
  },

  countProductsByVendor(where: Prisma.ProductWhereInput) {
    return prisma.product.count({ where });
  },
};
