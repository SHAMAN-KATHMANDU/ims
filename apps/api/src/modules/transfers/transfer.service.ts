import { createError } from "@/middlewares/errorHandler";
import { getPrismaOrderBy, createPaginationResult } from "@/utils/pagination";
import type { Prisma } from "@prisma/client";
import transferRepository, {
  type TransferRepository,
  type TransferWhere,
} from "./transfer.repository";
import auditRepository from "@/modules/audit/audit.repository";
import automationService from "@/modules/automation/automation.service";
import type {
  CreateTransferDto,
  GetAllTransfersQuery,
  CancelTransferDto,
} from "./transfer.schema";
import { ALLOWED_SORT_FIELDS } from "./transfer.schema";

export interface CreateTransferAuditContext {
  ip?: string;
  userAgent?: string;
}

export class TransferService {
  constructor(private repo: TransferRepository) {}

  async create(
    tenantId: string,
    userId: string,
    data: CreateTransferDto,
    auditContext?: CreateTransferAuditContext,
  ) {
    const [fromLocation, toLocation] = await Promise.all([
      this.repo.findLocationById(data.fromLocationId),
      this.repo.findLocationById(data.toLocationId),
    ]);

    if (!fromLocation) {
      throw createError("Source location not found", 404);
    }
    if (!toLocation) {
      throw createError("Destination location not found", 404);
    }
    if (!fromLocation.isActive) {
      throw createError("Source location is inactive", 400);
    }
    if (!toLocation.isActive) {
      throw createError("Destination location is inactive", 400);
    }

    const validatedItems: Array<{
      variationId: string;
      subVariationId: string | null;
      quantity: number;
    }> = [];
    const insufficientStock: Array<{
      product: string;
      imsCode: string;
      subVariationId?: string;
      requested: number;
      available: number;
    }> = [];

    for (const item of data.items) {
      const subVariationId = item.subVariationId ?? null;
      const variation = await this.repo.findVariationWithSubVariations(
        item.variationId,
      );

      if (!variation) {
        throw createError(
          `Product variation ${item.variationId} not found`,
          404,
        );
      }

      const hasSubVariants = (variation.subVariations?.length ?? 0) > 0;
      if (hasSubVariants && !subVariationId) {
        throw createError(
          `Product ${variation.product.name} has sub-variants; specify subVariationId for each item`,
          400,
        );
      }
      if (!hasSubVariants && subVariationId) {
        throw createError(
          `Product ${variation.product.name} has no sub-variants; do not send subVariationId`,
          400,
        );
      }
      if (subVariationId) {
        const belongs = variation.subVariations?.some(
          (s) => s.id === subVariationId,
        );
        if (!belongs) {
          throw createError(
            `Sub-variation ${subVariationId} does not belong to variation ${item.variationId}`,
            400,
          );
        }
      }

      const sourceInventory = await this.repo.findInventory(
        data.fromLocationId,
        item.variationId,
        subVariationId,
      );
      const availableQuantity = sourceInventory?.quantity ?? 0;
      if (availableQuantity < item.quantity) {
        insufficientStock.push({
          product: variation.product.name,
          imsCode: variation.product.imsCode,
          subVariationId: subVariationId ?? undefined,
          requested: item.quantity,
          available: availableQuantity,
        });
      }

      validatedItems.push({
        variationId: item.variationId,
        subVariationId,
        quantity: item.quantity,
      });
    }

    if (insufficientStock.length > 0) {
      const err = createError(
        "Insufficient stock for some items",
        400,
      ) as Error & {
        insufficientStock: typeof insufficientStock;
      };
      err.insufficientStock = insufficientStock;
      throw err;
    }

    const transfer = await this.repo.createTransfer({
      tenantId,
      fromLocationId: data.fromLocationId,
      toLocationId: data.toLocationId,
      createdById: userId,
      notes: data.notes ?? null,
      items: validatedItems,
    });

    await this.repo.createTransferLog(transfer.id, "CREATED", userId, {
      fromLocation: fromLocation.name,
      toLocation: toLocation.name,
      itemCount: validatedItems.length,
    });

    try {
      await auditRepository.create({
        tenantId,
        userId,
        action: "CREATE_TRANSFER",
        resource: "transfer",
        resourceId: transfer.id,
        details: {
          transferCode: transfer.transferCode,
          fromLocationId: data.fromLocationId,
          toLocationId: data.toLocationId,
        },
        ip: auditContext?.ip,
        userAgent: auditContext?.userAgent,
      });
    } catch (auditErr) {
      console.error("Audit log CREATE_TRANSFER failed:", auditErr);
    }

    await automationService
      .publishDomainEvent({
        tenantId,
        eventName: "transfers.transfer.created",
        entityType: "TRANSFER",
        entityId: transfer.id,
        actorUserId: userId,
        dedupeKey: `transfer-created:${transfer.id}`,
        payload: {
          transferId: transfer.id,
          transferCode: transfer.transferCode,
          fromLocationId: transfer.fromLocationId,
          toLocationId: transfer.toLocationId,
          status: transfer.status,
          itemCount: transfer.items.length,
        },
      })
      .catch(() => {
        // Transfer creation should not fail because automation publishing failed.
      });

    return transfer;
  }

  async createAndComplete(
    tenantId: string,
    userId: string,
    data: CreateTransferDto,
  ): Promise<void> {
    const transfer = await this.create(tenantId, userId, data);
    await this.approve(tenantId, userId, transfer.id);
    await this.startTransit(tenantId, userId, transfer.id);
    await this.complete(tenantId, userId, transfer.id);
  }

  async findAll(tenantId: string, query: GetAllTransfersQuery) {
    let orderBy: Prisma.TransferOrderByWithRelationInput = getPrismaOrderBy(
      query.sortBy,
      query.sortOrder,
      [...ALLOWED_SORT_FIELDS],
    ) ?? { createdAt: "desc" };

    const sb = query.sortBy?.toLowerCase();
    if (sb === "fromlocationname") {
      orderBy = { fromLocation: { name: query.sortOrder } };
    } else if (sb === "tolocationname") {
      orderBy = { toLocation: { name: query.sortOrder } };
    }

    const where: TransferWhere = { tenantId };
    if (query.status)
      where.status = query.status as
        | "PENDING"
        | "APPROVED"
        | "IN_TRANSIT"
        | "COMPLETED"
        | "CANCELLED";
    if (query.fromLocationId) where.fromLocationId = query.fromLocationId;
    if (query.toLocationId) where.toLocationId = query.toLocationId;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom)
        (where.createdAt as { gte?: Date }).gte = query.dateFrom;
      if (query.dateTo) (where.createdAt as { lte?: Date }).lte = query.dateTo;
    }
    if (query.locationId) {
      where.OR = [
        { fromLocationId: query.locationId },
        { toLocationId: query.locationId },
      ];
    }
    if (query.search) {
      const searchOr = [
        {
          transferCode: {
            contains: query.search,
            mode: "insensitive" as const,
          },
        },
        {
          fromLocation: {
            name: { contains: query.search, mode: "insensitive" as const },
          },
        },
        {
          toLocation: {
            name: { contains: query.search, mode: "insensitive" as const },
          },
        },
      ];
      where.OR = where.OR ? [...where.OR, ...searchOr] : searchOr;
    }

    const skip = (query.page - 1) * query.limit;
    const [totalItems, transfers] = await Promise.all([
      this.repo.countTransfers(where),
      this.repo.findManyTransfers(where, skip, query.limit, orderBy),
    ]);

    return createPaginationResult(
      transfers,
      totalItems,
      query.page,
      query.limit,
    );
  }

  async findById(tenantId: string, id: string) {
    const transfer = await this.repo.findTransferById(id);
    if (!transfer || transfer.tenantId !== tenantId) {
      throw createError("Transfer not found", 404);
    }
    return transfer;
  }

  async approve(tenantId: string, userId: string, id: string) {
    const transfer = await this.repo.findTransferWithItems(id);
    if (!transfer || transfer.tenantId !== tenantId) {
      throw createError("Transfer not found", 404);
    }
    if (transfer.status !== "PENDING") {
      throw createError(
        `Cannot approve transfer with status: ${transfer.status}`,
        400,
      );
    }

    const insufficientStock: Array<{
      product: string;
      imsCode: string;
      subVariationId?: string;
      requested: number;
      available: number;
    }> = [];

    for (const item of transfer.items) {
      const sourceInventory = await this.repo.findInventory(
        transfer.fromLocationId,
        item.variationId,
        item.subVariationId ?? null,
      );
      const availableQuantity = sourceInventory?.quantity ?? 0;
      if (availableQuantity < item.quantity) {
        insufficientStock.push({
          product: item.variation.product.name,
          imsCode: item.variation.product.imsCode,
          subVariationId: item.subVariationId ?? undefined,
          requested: item.quantity,
          available: availableQuantity,
        });
      }
    }

    if (insufficientStock.length > 0) {
      const err = createError(
        "Cannot approve: Insufficient stock for some items. Stock may have changed since transfer was created.",
        400,
      ) as Error & { insufficientStock: typeof insufficientStock };
      err.insufficientStock = insufficientStock;
      throw err;
    }

    const updated = await this.repo.updateTransferApprove(
      id,
      userId,
      new Date(),
    );
    await this.repo.createTransferLog(id, "APPROVED", userId);
    await automationService
      .publishDomainEvent({
        tenantId,
        eventName: "transfers.transfer.approved",
        entityType: "TRANSFER",
        entityId: updated.id,
        actorUserId: userId,
        dedupeKey: `transfer-approved:${updated.id}`,
        payload: {
          transferId: updated.id,
          transferCode: updated.transferCode,
          fromLocationId: updated.fromLocationId,
          toLocationId: updated.toLocationId,
          status: updated.status,
        },
      })
      .catch(() => {});
    return updated;
  }

  async startTransit(tenantId: string, userId: string, id: string) {
    const transfer = await this.repo.findTransferWithItems(id);
    if (!transfer || transfer.tenantId !== tenantId) {
      throw createError("Transfer not found", 404);
    }
    if (transfer.status !== "APPROVED") {
      throw createError(
        `Cannot start transit for transfer with status: ${transfer.status}. Transfer must be APPROVED first.`,
        400,
      );
    }

    for (const item of transfer.items) {
      const sourceRow = await this.repo.findInventory(
        transfer.fromLocationId,
        item.variationId,
        item.subVariationId ?? null,
      );
      if (!sourceRow) throw createError("Source inventory row not found", 500);
      await this.repo.decrementInventory(sourceRow.id, item.quantity);
    }

    const updated = await this.repo.updateTransferStatus(id, {
      status: "IN_TRANSIT",
    });
    await this.repo.createTransferLog(id, "IN_TRANSIT", userId, {
      message: "Stock deducted from source location",
    });

    await Promise.all(
      transfer.items.map((item) =>
        automationService.syncLowStockSignal({
          tenantId,
          locationId: transfer.fromLocationId,
          variationId: item.variationId,
          subVariationId: item.subVariationId,
          actorUserId: userId,
          reason: "transfer_in_transit",
        }),
      ),
    ).catch(() => {});

    await automationService
      .publishDomainEvent({
        tenantId,
        eventName: "transfers.transfer.in_transit",
        entityType: "TRANSFER",
        entityId: updated.id,
        actorUserId: userId,
        dedupeKey: `transfer-in-transit:${updated.id}`,
        payload: {
          transferId: updated.id,
          transferCode: updated.transferCode,
          fromLocationId: transfer.fromLocationId,
          toLocationId: transfer.toLocationId,
          status: updated.status,
        },
      })
      .catch(() => {});
    return updated;
  }

  async complete(tenantId: string, userId: string, id: string) {
    const transfer = await this.repo.findTransferWithItems(id);
    if (!transfer || transfer.tenantId !== tenantId) {
      throw createError("Transfer not found", 404);
    }
    if (transfer.status !== "IN_TRANSIT") {
      throw createError(
        `Cannot complete transfer with status: ${transfer.status}. Transfer must be IN_TRANSIT.`,
        400,
      );
    }

    for (const item of transfer.items) {
      const destRow = await this.repo.findInventory(
        transfer.toLocationId,
        item.variationId,
        item.subVariationId ?? null,
      );
      if (destRow) {
        await this.repo.incrementInventory(destRow.id, item.quantity);
      } else {
        await this.repo.createInventory({
          locationId: transfer.toLocationId,
          variationId: item.variationId,
          subVariationId: item.subVariationId ?? null,
          quantity: item.quantity,
        });
      }
    }

    const updated = await this.repo.updateTransferStatus(id, {
      status: "COMPLETED",
      completedAt: new Date(),
    });
    await this.repo.createTransferLog(id, "COMPLETED", userId, {
      message: "Stock added to destination location",
    });

    await Promise.all(
      transfer.items.map((item) =>
        automationService.syncLowStockSignal({
          tenantId,
          locationId: transfer.toLocationId,
          variationId: item.variationId,
          subVariationId: item.subVariationId,
          actorUserId: userId,
          reason: "transfer_completed",
        }),
      ),
    ).catch(() => {});

    await automationService
      .publishDomainEvent({
        tenantId,
        eventName: "transfers.transfer.completed",
        entityType: "TRANSFER",
        entityId: updated.id,
        actorUserId: userId,
        dedupeKey: `transfer-completed:${updated.id}`,
        payload: {
          transferId: updated.id,
          transferCode: updated.transferCode,
          fromLocationId: transfer.fromLocationId,
          toLocationId: transfer.toLocationId,
          status: updated.status,
        },
      })
      .catch(() => {});
    return updated;
  }

  async cancel(
    tenantId: string,
    userId: string,
    id: string,
    data?: CancelTransferDto,
  ) {
    const transfer = await this.repo.findTransferById(id);
    if (!transfer || transfer.tenantId !== tenantId) {
      throw createError("Transfer not found", 404);
    }
    if (transfer.status === "COMPLETED") {
      throw createError("Cannot cancel a completed transfer", 400);
    }
    if (transfer.status === "CANCELLED") {
      throw createError("Transfer is already cancelled", 400);
    }

    if (transfer.status === "IN_TRANSIT") {
      const transferWithItems = await this.repo.findTransferWithItems(id);
      if (transferWithItems) {
        for (const item of transferWithItems.items) {
          const sourceRow = await this.repo.findInventory(
            transfer.fromLocationId,
            item.variationId,
            item.subVariationId ?? null,
          );
          if (sourceRow) {
            await this.repo.incrementInventory(sourceRow.id, item.quantity);
          } else {
            await this.repo.createInventory({
              locationId: transfer.fromLocationId,
              variationId: item.variationId,
              subVariationId: item.subVariationId ?? null,
              quantity: item.quantity,
            });
          }
        }
      }
    }

    const previousStatus = transfer.status;
    const updated = await this.repo.updateTransferCancel(id);
    await this.repo.createTransferLog(id, "CANCELLED", userId, {
      reason: data?.reason ?? "No reason provided",
      previousStatus,
      stockRestored: previousStatus === "IN_TRANSIT",
    });

    if (previousStatus === "IN_TRANSIT") {
      const transferWithItems = await this.repo.findTransferWithItems(id);
      await Promise.all(
        (transferWithItems?.items ?? []).map((item) =>
          automationService.syncLowStockSignal({
            tenantId,
            locationId: transfer.fromLocationId,
            variationId: item.variationId,
            subVariationId: item.subVariationId,
            actorUserId: userId,
            reason: "transfer_cancelled_restore",
          }),
        ),
      ).catch(() => {});
    }

    await automationService
      .publishDomainEvent({
        tenantId,
        eventName: "transfers.transfer.cancelled",
        entityType: "TRANSFER",
        entityId: updated.id,
        actorUserId: userId,
        dedupeKey: `transfer-cancelled:${updated.id}`,
        payload: {
          transferId: updated.id,
          transferCode: updated.transferCode,
          fromLocationId: transfer.fromLocationId,
          toLocationId: transfer.toLocationId,
          status: updated.status,
          previousStatus,
        },
      })
      .catch(() => {});
    return { transfer: updated, previousStatus };
  }

  async getLogs(tenantId: string, id: string) {
    const transfer = await this.repo.findTransferById(id);
    if (!transfer || transfer.tenantId !== tenantId) {
      throw createError("Transfer not found", 404);
    }
    const logs = await this.repo.findTransferLogs(id);
    return { transferCode: transfer.transferCode, logs };
  }
}

export default new TransferService(transferRepository);
