import { createError } from "@/middlewares/errorHandler";
import { logger } from "@/config/logger";
import automationService from "@/modules/automation/automation.service";
import { createDeleteAuditLog } from "@/shared/audit/createDeleteAuditLog";
import { normalizePhoneOptional } from "@/utils/phone";
import { getPaginationParams } from "@/utils/pagination";
import vendorRepository, { VendorRepository } from "./vendor.repository";
import type { CreateVendorDto, UpdateVendorDto } from "./vendor.schema";

export class VendorService {
  constructor(private repo: VendorRepository) {}

  async create(
    tenantId: string,
    data: CreateVendorDto,
  ): Promise<ReturnType<VendorRepository["create"]>> {
    const trimmedName = data.name.trim();

    const existing = await this.repo.findByName(tenantId, trimmedName);
    if (existing) {
      const err = createError("Vendor with this name already exists", 409);
      (err as unknown as Record<string, unknown>).existingVendor = {
        id: existing.id,
        name: existing.name,
      };
      throw err;
    }

    let normalizedPhone: string | null = null;
    if (data.phone != null && String(data.phone).trim()) {
      normalizedPhone = normalizePhoneOptional(data.phone);
    }

    const vendor = await this.repo.create(tenantId, {
      ...data,
      name: trimmedName,
      phone: normalizedPhone,
    });
    await automationService
      .publishDomainEvent({
        tenantId,
        eventName: "vendors.vendor.created",
        scopeType: "GLOBAL",
        entityType: "VENDOR",
        entityId: vendor.id,
        dedupeKey: `vendor-created:${vendor.id}`,
        payload: {
          vendorId: vendor.id,
          name: vendor.name,
          contact: vendor.contact ?? null,
          address: vendor.address ?? null,
          phone: vendor.phone ?? null,
        },
      })
      .catch((error) => {
        logger.error("Automation event publishing failed", undefined, {
          tenantId,
          vendorId: vendor.id,
          eventName: "vendors.vendor.created",
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return vendor;
  }

  async findAll(tenantId: string, rawQuery: Record<string, unknown>) {
    const query = getPaginationParams(rawQuery);
    return this.repo.findAll(tenantId, query);
  }

  async findById(id: string, tenantId: string) {
    const vendor = await this.repo.findById(id, tenantId);
    if (!vendor) throw createError("Vendor not found", 404);
    return vendor;
  }

  async findVendorProducts(
    vendorId: string,
    tenantId: string,
    rawQuery: Record<string, unknown>,
  ) {
    const vendor = await this.repo.findById(vendorId, tenantId);
    if (!vendor) throw createError("Vendor not found", 404);

    const query = getPaginationParams(rawQuery);
    return this.repo.findVendorProducts(vendorId, tenantId, query);
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateVendorDto,
  ): Promise<ReturnType<VendorRepository["update"]>> {
    const existing = await this.repo.findByIdWithProductCount(id, tenantId);
    if (!existing) throw createError("Vendor not found", 404);

    const trimmedName = data.name?.trim();

    if (trimmedName && trimmedName !== existing.name) {
      const nameConflict = await this.repo.findByNameExcluding(
        tenantId,
        trimmedName,
        id,
      );
      if (nameConflict) {
        const err = createError("Vendor with this name already exists", 409);
        (err as unknown as Record<string, unknown>).existingVendor = {
          id: nameConflict.id,
          name: nameConflict.name,
        };
        throw err;
      }
    }

    const updateData: UpdateVendorDto & { phone?: string | null } = {};
    if (trimmedName !== undefined) updateData.name = trimmedName;
    if (data.contact !== undefined) updateData.contact = data.contact ?? null;
    if (data.address !== undefined) updateData.address = data.address ?? null;

    if (data.phone !== undefined) {
      updateData.phone = normalizePhoneOptional(data.phone ?? "");
    }

    const vendor = await this.repo.update(id, updateData);
    await automationService
      .publishDomainEvent({
        tenantId,
        eventName: "vendors.vendor.updated",
        scopeType: "GLOBAL",
        entityType: "VENDOR",
        entityId: vendor.id,
        dedupeKey: `vendor-updated:${vendor.id}:${vendor.updatedAt.toISOString()}`,
        payload: {
          vendorId: vendor.id,
          name: vendor.name,
          contact: vendor.contact ?? null,
          address: vendor.address ?? null,
          phone: vendor.phone ?? null,
        },
      })
      .catch((error) => {
        logger.error("Automation event publishing failed", undefined, {
          tenantId,
          vendorId: vendor.id,
          eventName: "vendors.vendor.updated",
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return vendor;
  }

  async delete(
    id: string,
    tenantId: string,
    ctx: { userId: string; reason?: string; ip?: string; userAgent?: string },
  ): Promise<void> {
    const existing = await this.repo.findByIdWithProductCount(id, tenantId);
    if (!existing) throw createError("Vendor not found", 404);

    if (existing._count.products > 0) {
      const count = existing._count.products;
      const err = createError(
        `Cannot delete vendor — ${count} product${count === 1 ? "" : "s"} are associated. Please reassign or remove those products first.`,
        400,
      );
      (err as unknown as Record<string, unknown>).productCount = count;
      throw err;
    }

    await this.repo.softDelete(id, {
      deletedBy: ctx.userId,
      deleteReason: ctx.reason ?? null,
    });
    await createDeleteAuditLog({
      userId: ctx.userId,
      tenantId,
      resource: "Vendor",
      resourceId: id,
      deleteReason: ctx.reason ?? undefined,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }
}

export default new VendorService(vendorRepository);
