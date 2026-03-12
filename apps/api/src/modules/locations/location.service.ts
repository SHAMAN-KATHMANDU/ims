import { createError } from "@/middlewares/errorHandler";
import { createDeleteAuditLog } from "@/shared/audit/createDeleteAuditLog";
import { getPaginationParams } from "@/utils/pagination";
import locationRepository, { LocationRepository } from "./location.repository";
import type { CreateLocationDto, UpdateLocationDto } from "./location.schema";

export class LocationService {
  constructor(private repo: LocationRepository) {}

  async create(tenantId: string, data: CreateLocationDto) {
    const existing = await this.repo.findByName(tenantId, data.name);
    if (existing) {
      const isDeactivated =
        existing.deletedAt !== null || !existing.isActive;
      if (isDeactivated) {
        let restored = await this.repo.restore(existing.id);
        if (data.isDefaultWarehouse === true) {
          await this.repo.unsetDefaultWarehouse(existing.id);
          restored = await this.repo.update(existing.id, {
            isDefaultWarehouse: true,
          });
        }
        return { location: restored, restored: true };
      }
      throw createError("Location with this name already exists", 409);
    }

    if (data.isDefaultWarehouse === true) {
      await this.repo.unsetDefaultWarehouse();
    }

    const location = await this.repo.create(tenantId, data);
    return { location, restored: false };
  }

  async findAll(
    tenantId: string,
    rawQuery: Record<string, unknown>,
    filters?: {
      type?: string;
      activeOnly?: boolean;
      status?: string;
    },
  ) {
    const query = getPaginationParams(rawQuery);
    return this.repo.findAll(tenantId, query, filters);
  }

  async findById(id: string, tenantId?: string) {
    const location = await this.repo.findById(id, tenantId);
    if (!location) throw createError("Location not found", 404);
    return location;
  }

  async update(id: string, data: UpdateLocationDto, tenantId?: string) {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) throw createError("Location not found", 404);

    if (data.name !== undefined && data.name !== existing.name) {
      const nameConflict = await this.repo.findByNameExcluding(
        existing.tenantId,
        data.name,
        id,
      );
      if (nameConflict) {
        throw createError("Location name already taken", 409);
      }
    }

    if (
      data.type !== undefined &&
      !["WAREHOUSE", "SHOWROOM"].includes(data.type)
    ) {
      throw createError(
        "Invalid location type. Must be WAREHOUSE or SHOWROOM",
        400,
      );
    }

    if (
      data.isActive === false &&
      existing.type === "WAREHOUSE" &&
      existing.isActive
    ) {
      const activeCount = await this.repo.countActiveWarehouses(id);
      if (activeCount <= 1) {
        throw createError(
          "At least one warehouse must remain active. Please activate another warehouse before deactivating this one.",
          400,
        );
      }
    }

    const updateData: UpdateLocationDto & { isDefaultWarehouse?: boolean } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.address !== undefined) updateData.address = data.address ?? null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.isDefaultWarehouse !== undefined) {
      updateData.isDefaultWarehouse = data.isDefaultWarehouse === true;
      if (data.isDefaultWarehouse === true) {
        await this.repo.unsetDefaultWarehouse(id);
      }
    }

    return this.repo.update(id, updateData);
  }

  async delete(
    id: string,
    tenantId: string,
    ctx: { userId: string; reason?: string; ip?: string; userAgent?: string },
  ) {
    const existing = await this.repo.findByIdWithTransferCounts(id, tenantId);
    if (!existing) throw createError("Location not found", 404);

    if (existing._count.transfersFrom > 0 || existing._count.transfersTo > 0) {
      throw createError(
        "Cannot delete location with pending transfers. Complete or cancel all transfers first.",
        400,
      );
    }

    if (existing.type === "WAREHOUSE" && existing.isActive) {
      const activeCount = await this.repo.countActiveWarehouses(id);
      if (activeCount <= 1) {
        throw createError(
          "At least one warehouse must remain active. Please activate another warehouse before deactivating this one.",
          400,
        );
      }
    }

    await this.repo.softDelete(id, {
      deletedBy: ctx.userId,
      deleteReason: ctx.reason ?? null,
    });
    await createDeleteAuditLog({
      userId: ctx.userId,
      tenantId,
      resource: "Location",
      resourceId: id,
      deleteReason: ctx.reason ?? undefined,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  async restore(id: string, tenantId: string) {
    const existing = await this.repo.findByIdIncludingDeactivated(id, tenantId);
    if (!existing) throw createError("Location not found", 404);
    if (!existing.deletedAt) {
      throw createError("Location is not deactivated", 400);
    }
    const restored = await this.repo.restore(id);
    return restored;
  }

  async getInventory(locationId: string, rawQuery: Record<string, unknown>) {
    const location = await this.repo.findById(locationId);
    if (!location) throw createError("Location not found", 404);

    const query = getPaginationParams(rawQuery);
    const result = await this.repo.getInventory(locationId, query);
    return { location, ...result };
  }
}

export default new LocationService(locationRepository);
