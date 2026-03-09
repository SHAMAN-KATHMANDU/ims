import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import type { CreateVendorDto, UpdateVendorDto } from "./vendor.schema";

const ALLOWED_SORT_FIELDS = ["id", "name", "createdAt", "updatedAt"];

const VENDOR_SELECT = {
  id: true,
  name: true,
  contact: true,
  phone: true,
  address: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { products: true },
  },
} as const;

export class VendorRepository {
  async findByName(tenantId: string, name: string) {
    return prisma.vendor.findFirst({ where: { tenantId, name } });
  }

  async findByNameExcluding(tenantId: string, name: string, excludeId: string) {
    return prisma.vendor.findFirst({
      where: { tenantId, name, id: { not: excludeId } },
    });
  }

  async create(
    tenantId: string,
    data: CreateVendorDto & { phone: string | null },
  ) {
    return prisma.vendor.create({
      data: {
        tenantId,
        name: data.name.trim(),
        contact: data.contact ?? null,
        phone: data.phone,
        address: data.address ?? null,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: ReturnType<typeof getPaginationParams>,
  ) {
    const { page, limit, sortBy, sortOrder, search } = query;

    const orderBy = getPrismaOrderBy(
      sortBy,
      sortOrder,
      ALLOWED_SORT_FIELDS,
    ) ?? {
      name: "asc" as const,
    };

    const where: Parameters<typeof prisma.vendor.findMany>[0]["where"] = {
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
      prisma.vendor.count({ where }),
      prisma.vendor.findMany({
        where,
        select: VENDOR_SELECT,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return createPaginationResult(vendors, totalItems, page, limit);
  }

  async findById(id: string, tenantId: string) {
    return prisma.vendor.findFirst({
      where: { id, tenantId },
      select: VENDOR_SELECT,
    });
  }

  async findByIdWithProductCount(id: string, tenantId: string) {
    return prisma.vendor.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { products: true } },
      },
    });
  }

  async update(id: string, data: UpdateVendorDto & { phone?: string | null }) {
    return prisma.vendor.update({ where: { id }, data });
  }

  async softDelete(
    id: string,
    data: { deletedBy: string; deleteReason?: string | null },
  ) {
    return prisma.vendor.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: data.deletedBy,
        deleteReason: data.deleteReason ?? undefined,
      },
    });
  }

  async findVendorProducts(
    vendorId: string,
    tenantId: string,
    query: ReturnType<typeof getPaginationParams>,
  ) {
    const { page, limit, search } = query;
    const productLimit = Math.min(50, Math.max(1, limit));
    const productPage = Math.max(1, page);
    const skip = (productPage - 1) * productLimit;

    const where: Parameters<typeof prisma.product.findMany>[0]["where"] = {
      vendorId,
      tenantId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { imsCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const [totalItems, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          mrp: true,
          costPrice: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: productLimit,
      }),
    ]);

    return createPaginationResult(
      products,
      totalItems,
      productPage,
      productLimit,
    );
  }
}

export default new VendorRepository();
