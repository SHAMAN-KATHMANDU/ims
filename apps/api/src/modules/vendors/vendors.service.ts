/**
 * Vendors service - business logic for vendors module.
 */

import type { Prisma } from "@prisma/client";
import { NotFoundError, DomainError, AppError } from "@/shared/errors";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { vendorsRepository } from "./vendors.repository";

const ALLOWED_SORT_FIELDS = ["id", "name", "createdAt", "updatedAt"];

export type CreateVendorInput = {
  name: string;
  contact?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type UpdateVendorInput = {
  name?: string;
  contact?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type VendorListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type VendorProductsQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export const vendorsService = {
  async create(tenantId: string, input: CreateVendorInput) {
    const existing = await vendorsRepository.findVendorByName(
      tenantId,
      input.name,
    );
    if (existing) {
      throw new AppError("Vendor with this name already exists", 409);
    }
    return vendorsRepository.createVendor({
      tenant: { connect: { id: tenantId } },
      name: input.name,
      contact: input.contact ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
    });
  },

  async getAll(tenantId: string, query: VendorListQuery) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(query);

    const orderBy =
      getPrismaOrderBy(sortBy, sortOrder, ALLOWED_SORT_FIELDS) ??
      ({ name: "asc" as const } as Prisma.VendorOrderByWithRelationInput);

    const where: Prisma.VendorWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contact: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [totalItems, vendors] = await Promise.all([
      vendorsRepository.countVendors(where),
      vendorsRepository.findVendors({ where, orderBy, skip, take: limit }),
    ]);

    const result = createPaginationResult(vendors, totalItems, page, limit);
    return { data: result.data, pagination: result.pagination };
  },

  async getById(id: string, tenantId: string) {
    const vendor = await vendorsRepository.findVendorById(id, tenantId);
    if (!vendor) {
      throw new NotFoundError("Vendor not found");
    }
    return vendor;
  },

  async getVendorProducts(
    id: string,
    tenantId: string,
    query: VendorProductsQuery,
  ) {
    const vendor = await vendorsRepository.findVendorById(id, tenantId);
    if (!vendor) {
      throw new NotFoundError("Vendor not found");
    }

    const { page, limit, search } = getPaginationParams(query);
    const productLimit = Math.min(50, Math.max(1, limit));
    const productPage = Math.max(1, page);
    const skip = (productPage - 1) * productLimit;

    const where: Prisma.ProductWhereInput = {
      vendorId: id,
      tenantId,
      deletedAt: null,
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { imsCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const [totalItems, products] = await Promise.all([
      vendorsRepository.countProductsByVendor(where),
      vendorsRepository.findProductsByVendor({
        where,
        skip,
        take: productLimit,
      }),
    ]);

    const result = createPaginationResult(
      products,
      totalItems,
      productPage,
      productLimit,
    );
    return { data: result.data, pagination: result.pagination };
  },

  async update(id: string, tenantId: string, input: UpdateVendorInput) {
    const existing = await vendorsRepository.findVendorByIdForUpdateOrDelete(
      id,
      tenantId,
    );
    if (!existing) {
      throw new NotFoundError("Vendor not found");
    }

    if (input.name !== undefined && input.name !== existing.name) {
      const nameExists = await vendorsRepository.findVendorByName(
        tenantId,
        input.name,
      );
      if (nameExists) {
        throw new AppError("Vendor with this name already exists", 409);
      }
    }

    const updateData: Prisma.VendorUpdateInput = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.contact !== undefined) updateData.contact = input.contact ?? null;
    if (input.phone !== undefined) updateData.phone = input.phone ?? null;
    if (input.address !== undefined) updateData.address = input.address ?? null;

    return vendorsRepository.updateVendor(id, updateData);
  },

  async delete(id: string, tenantId: string) {
    const vendor = await vendorsRepository.findVendorByIdForUpdateOrDelete(
      id,
      tenantId,
    );
    if (!vendor) {
      throw new NotFoundError("Vendor not found");
    }
    const count = vendor._count.products;
    if (count > 0) {
      throw new DomainError(
        400,
        `Cannot delete vendor — ${count} product${count === 1 ? "" : "s"} are associated. Please reassign or remove those products first.`,
      );
    }
    await vendorsRepository.softDeleteVendor(id);
  },
};
