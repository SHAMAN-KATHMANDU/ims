import prisma, { basePrisma } from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import type { CreateLocationDto, UpdateLocationDto } from "./location.schema";

const ALLOWED_SORT_FIELDS = [
  "id",
  "name",
  "type",
  "createdAt",
  "updatedAt",
] as const;

const LOCATION_INCLUDE = {
  _count: {
    select: {
      inventory: true,
      transfersFrom: true,
      transfersTo: true,
    },
  },
} as const;

export class LocationRepository {
  async findByName(tenantId: string, name: string) {
    return prisma.location.findFirst({
      where: { tenantId, name },
    });
  }

  async findByNameExcluding(tenantId: string, name: string, excludeId: string) {
    return prisma.location.findFirst({
      where: { tenantId, name, id: { not: excludeId } },
    });
  }

  async create(tenantId: string, data: CreateLocationDto) {
    return prisma.location.create({
      data: {
        tenantId,
        name: data.name,
        type: data.type,
        address: data.address ?? null,
        isDefaultWarehouse: data.isDefaultWarehouse === true,
      },
      include: LOCATION_INCLUDE,
    });
  }

  async findAll(
    tenantId: string,
    query: ReturnType<typeof getPaginationParams>,
    filters?: {
      type?: string;
      activeOnly?: boolean;
      status?: string;
    },
  ) {
    const { page, limit, sortBy, sortOrder, search } = query;

    const orderBy = getPrismaOrderBy(sortBy, sortOrder, [
      ...ALLOWED_SORT_FIELDS,
    ]) ?? {
      name: "asc" as const,
    };

    const where: Record<string, unknown> = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    if (filters?.type && ["WAREHOUSE", "SHOWROOM"].includes(filters.type)) {
      where.type = filters.type;
    }

    // Status filter: active (non-deleted, isActive), inactive (soft-deleted), all (both)
    if (filters?.activeOnly || filters?.status === "active") {
      where.isActive = true;
      // Prisma extension injects deletedAt: null for trashable models
    } else if (filters?.status === "inactive") {
      // Explicit deletedAt so extension skips; return only soft-deleted
      where.deletedAt = { not: null };
    }
    // status === "all" or undefined: no deletedAt filter — use basePrisma to include soft-deleted

    const skip = (page - 1) * limit;
    const includeDeleted =
      !filters?.activeOnly && filters?.status !== "active" && filters?.status !== "inactive";

    const client = includeDeleted ? basePrisma.location : prisma.location;

    const [totalItems, locations] = await Promise.all([
      client.count({ where }),
      client.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: LOCATION_INCLUDE,
      }),
    ]);

    return createPaginationResult(locations, totalItems, page, limit);
  }

  async findById(id: string, tenantId?: string) {
    const where: { id: string; tenantId?: string } = { id };
    if (tenantId) where.tenantId = tenantId;
    return prisma.location.findFirst({
      where,
      include: LOCATION_INCLUDE,
    });
  }

  /** Find location by id and tenantId including soft-deleted (for restore flow). */
  async findByIdIncludingDeactivated(id: string, tenantId: string) {
    return basePrisma.location.findFirst({
      where: { id, tenantId },
      include: LOCATION_INCLUDE,
    });
  }

  async findByIdWithTransferCounts(id: string, tenantId?: string) {
    const where: { id: string; tenantId?: string } = { id };
    if (tenantId) where.tenantId = tenantId;
    return prisma.location.findFirst({
      where,
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
  }

  async update(
    id: string,
    data: UpdateLocationDto & { isDefaultWarehouse?: boolean },
  ) {
    return prisma.location.update({
      where: { id },
      data,
      include: LOCATION_INCLUDE,
    });
  }

  async unsetDefaultWarehouse(excludeId?: string) {
    const where: Record<string, unknown> = { isDefaultWarehouse: true };
    if (excludeId) where.id = { not: excludeId };
    return prisma.location.updateMany({
      where,
      data: { isDefaultWarehouse: false },
    });
  }

  async softDelete(
    id: string,
    data: { deletedBy: string; deleteReason?: string | null },
  ) {
    return prisma.location.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: data.deletedBy,
        deleteReason: data.deleteReason ?? undefined,
      },
    });
  }

  async restore(id: string) {
    return prisma.location.update({
      where: { id },
      data: {
        isActive: true,
        deletedAt: null,
        deletedBy: null,
        deleteReason: null,
      },
    });
  }

  async countActiveWarehouses(excludeId?: string) {
    const where: Record<string, unknown> = {
      type: "WAREHOUSE",
      isActive: true,
    };
    if (excludeId) where.id = { not: excludeId };
    return prisma.location.count({ where });
  }

  async getInventory(
    locationId: string,
    query: ReturnType<typeof getPaginationParams>,
  ) {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { locationId };
    if (search) {
      where.variation = {
        OR: [
          { imsCode: { contains: search, mode: "insensitive" } },
          {
            product: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        ],
      };
    }

    const [totalItems, inventory] = await Promise.all([
      prisma.locationInventory.count({ where }),
      prisma.locationInventory.findMany({
        where,
        skip,
        take: limit,
        include: {
          variation: {
            include: {
              product: {
                select: {
                  id: true,
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
        orderBy: {
          variation: {
            product: {
              name: "asc",
            },
          },
        },
      }),
    ]);

    return createPaginationResult(inventory, totalItems, page, limit);
  }
}

export default new LocationRepository();
