/**
 * Locations service - business logic for locations module.
 */

import type { Prisma } from "@prisma/client";
import { AppError, NotFoundError, DomainError } from "@/shared/errors";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { locationsRepository } from "./locations.repository";

const ALLOWED_SORT_FIELDS = [
  "id",
  "name",
  "type",
  "createdAt",
  "updatedAt",
] as const;

export interface LocationListFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  type?: "WAREHOUSE" | "SHOWROOM";
  activeOnly?: boolean;
  status?: "active" | "inactive";
}

export interface CreateLocationInput {
  tenantId: string;
  name: string;
  type?: "WAREHOUSE" | "SHOWROOM";
  address?: string | null;
  isDefaultWarehouse?: boolean;
}

export interface UpdateLocationInput {
  name?: string;
  type?: "WAREHOUSE" | "SHOWROOM";
  address?: string | null;
  isActive?: boolean;
  isDefaultWarehouse?: boolean;
}

export const locationsService = {
  async create(tenantId: string, input: Omit<CreateLocationInput, "tenantId">) {
    const existing = await locationsRepository.findLocationByName(
      tenantId,
      input.name,
    );
    if (existing) {
      throw new AppError("Location with this name already exists", 409);
    }

    if (input.isDefaultWarehouse === true) {
      await locationsRepository.unsetDefaultWarehouses(tenantId);
    }

    return locationsRepository.createLocation({
      tenant: { connect: { id: tenantId } },
      name: input.name,
      type: input.type ?? "SHOWROOM",
      address: input.address ?? null,
      isDefaultWarehouse: input.isDefaultWarehouse === true,
    });
  },

  async getAll(tenantId: string, filters: LocationListFilters) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(filters);
    const { type: typeFilter, activeOnly, status: statusFilter } = filters;

    const orderBy = getPrismaOrderBy(sortBy, sortOrder, [
      ...ALLOWED_SORT_FIELDS,
    ]) ?? {
      name: "asc",
    };

    const where: Prisma.LocationWhereInput = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }
    if (typeFilter) where.type = typeFilter;
    if (activeOnly || statusFilter === "active") where.isActive = true;
    else if (statusFilter === "inactive") where.isActive = false;

    const skip = (page - 1) * limit;
    const [totalItems, locations] = await Promise.all([
      locationsRepository.countLocations(where),
      locationsRepository.findLocations({
        where,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return createPaginationResult(locations, totalItems, page, limit);
  },

  async getById(id: string) {
    const location = await locationsRepository.findLocationById(id);
    if (!location) {
      throw new NotFoundError("Location not found");
    }
    return location;
  },

  async update(id: string, tenantId: string, input: UpdateLocationInput) {
    const existing = await locationsRepository.findLocationById(id);
    if (!existing) {
      throw new NotFoundError("Location not found");
    }

    const updateData: Prisma.LocationUpdateInput = {};

    if (input.name !== undefined) {
      if (input.name !== existing.name) {
        const nameExists = await locationsRepository.findLocationByName(
          tenantId,
          input.name,
        );
        if (nameExists) {
          throw new AppError("Location name already taken", 409);
        }
      }
      updateData.name = input.name;
    }

    if (input.type !== undefined) updateData.type = input.type;
    if (input.address !== undefined) updateData.address = input.address ?? null;

    if (input.isActive !== undefined) {
      if (
        input.isActive === false &&
        existing.type === "WAREHOUSE" &&
        existing.isActive
      ) {
        const activeCount =
          await locationsRepository.countActiveWarehouses(tenantId);
        if (activeCount <= 1) {
          throw new DomainError(
            400,
            "At least one warehouse must remain active. Please activate another warehouse before deactivating this one.",
          );
        }
      }
      updateData.isActive = input.isActive;
    }

    if (input.isDefaultWarehouse !== undefined) {
      updateData.isDefaultWarehouse = input.isDefaultWarehouse === true;
      if (input.isDefaultWarehouse === true) {
        await locationsRepository.unsetDefaultWarehousesExcept(tenantId, id);
      }
    }

    return locationsRepository.updateLocation(id, updateData);
  },

  async delete(id: string, tenantId: string) {
    const existing =
      await locationsRepository.findLocationByIdWithTransferCounts(id);
    if (!existing) {
      throw new NotFoundError("Location not found");
    }

    if (existing._count.transfersFrom > 0 || existing._count.transfersTo > 0) {
      throw new DomainError(
        400,
        "Cannot delete location with pending transfers. Complete or cancel all transfers first.",
      );
    }

    if (existing.type === "WAREHOUSE" && existing.isActive) {
      const activeCount =
        await locationsRepository.countActiveWarehouses(tenantId);
      if (activeCount <= 1) {
        throw new DomainError(
          400,
          "At least one warehouse must remain active. Please activate another warehouse before deactivating this one.",
        );
      }
    }

    await locationsRepository.softDeleteLocation(id);
  },

  async getLocationInventory(
    locationId: string,
    params: { page: number; limit: number; search?: string },
  ) {
    const location = await locationsRepository.findLocationById(locationId);
    if (!location) {
      throw new NotFoundError("Location not found");
    }

    const { page, limit, search } = params;
    const where: Prisma.LocationInventoryWhereInput = {};

    if (search) {
      where.variation = {
        OR: [
          { color: { contains: search, mode: "insensitive" } },
          {
            product: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { imsCode: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        ],
      };
    }

    const skip = (page - 1) * limit;
    const [totalItems, inventory] = await Promise.all([
      locationsRepository.countLocationInventory({ locationId, ...where }),
      locationsRepository.findLocationInventory({
        locationId,
        where: Object.keys(where).length > 0 ? where : undefined,
        skip,
        take: limit,
        orderBy: {
          variation: {
            product: { name: "asc" },
          },
        },
      }),
    ]);

    const pagination = createPaginationResult(
      inventory,
      totalItems,
      page,
      limit,
    );
    return { location, ...pagination };
  },
};
