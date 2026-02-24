/**
 * Transfers service - business logic for transfers module.
 */

import type { Prisma } from "@prisma/client";
import { NotFoundError, DomainError, AppError } from "@/shared/errors";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import {
  transfersRepository,
  type TransferItemInput,
  type CreateTransferParams,
} from "./transfers.repository";

const ALLOWED_SORT_FIELDS = [
  "id",
  "transferCode",
  "status",
  "createdAt",
  "approvedAt",
  "completedAt",
];

function generateTransferCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TRF-${timestamp}-${random}`;
}

export type CreateTransferBody = {
  fromLocationId: string;
  toLocationId: string;
  items: Array<{
    variationId: string;
    subVariationId?: string | null;
    quantity: number;
  }>;
  notes?: string | null;
};

export type GetAllTransfersQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: "PENDING" | "APPROVED" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
  fromLocationId?: string;
  toLocationId?: string;
  locationId?: string;
};

export type RequestContext = {
  ip?: string;
  userAgent?: string;
};

export const transfersService = {
  async create(
    tenantId: string,
    userId: string,
    body: CreateTransferBody,
    ctx?: RequestContext,
  ) {
    const { fromLocationId, toLocationId, items, notes } = body;

    const [fromLocation, toLocation] = await Promise.all([
      transfersRepository.findLocationById(fromLocationId),
      transfersRepository.findLocationById(toLocationId),
    ]);

    if (!fromLocation) {
      throw new NotFoundError("Source location not found");
    }
    if (!toLocation) {
      throw new NotFoundError("Destination location not found");
    }
    if (!fromLocation.isActive) {
      throw new DomainError(400, "Source location is inactive");
    }
    if (!toLocation.isActive) {
      throw new DomainError(400, "Destination location is inactive");
    }

    const validatedItems: TransferItemInput[] = [];
    const insufficientStock: Array<{
      product: string;
      color: string;
      subVariationId?: string;
      requested: number;
      available: number;
    }> = [];

    for (const item of items) {
      const subVariationId = item.subVariationId ?? null;

      const variation = await transfersRepository.findVariationForTransfer(
        item.variationId,
      );
      if (!variation) {
        throw new NotFoundError(
          `Product variation ${item.variationId} not found`,
        );
      }

      const hasSubVariants = (variation.subVariations?.length ?? 0) > 0;
      if (hasSubVariants && !subVariationId) {
        throw new DomainError(
          400,
          `Variation ${variation.color} has sub-variants; specify subVariationId for each item`,
        );
      }
      if (!hasSubVariants && subVariationId) {
        throw new DomainError(
          400,
          `Variation ${variation.color} has no sub-variants; do not send subVariationId`,
        );
      }
      if (subVariationId) {
        const belongs = variation.subVariations?.some(
          (s) => s.id === subVariationId,
        );
        if (!belongs) {
          throw new DomainError(
            400,
            `Sub-variation ${subVariationId} does not belong to variation ${item.variationId}`,
          );
        }
      }

      const sourceInventory = await transfersRepository.findInventory(
        fromLocationId,
        item.variationId,
        subVariationId,
      );
      const availableQuantity = sourceInventory?.quantity ?? 0;
      if (availableQuantity < item.quantity) {
        insufficientStock.push({
          product: variation.product.name,
          color: variation.color,
          subVariationId: subVariationId ?? undefined,
          requested: item.quantity,
          available: availableQuantity,
        });
      }

      validatedItems.push({
        variationId: item.variationId,
        subVariationId,
        quantity: parseInt(String(item.quantity), 10),
      });
    }

    if (insufficientStock.length > 0) {
      throw new AppError("Insufficient stock for some items", 400, undefined, {
        insufficientStock,
      });
    }

    const params: CreateTransferParams = {
      tenantId,
      userId,
      transferCode: generateTransferCode(),
      fromLocationId,
      toLocationId,
      notes: notes ?? null,
      items: validatedItems,
      fromLocationName: fromLocation.name,
      toLocationName: toLocation.name,
      ip: ctx?.ip,
      userAgent: ctx?.userAgent,
    };

    return transfersRepository.createTransferWithItemsAndLog(params);
  },

  async getAll(tenantId: string, query: GetAllTransfersQuery) {
    const { page, limit, sortBy, sortOrder } = getPaginationParams(query);
    const { status, fromLocationId, toLocationId, locationId, search } = query;

    const orderBy =
      getPrismaOrderBy(sortBy, sortOrder, ALLOWED_SORT_FIELDS) ??
      ({ createdAt: "desc" } as Prisma.TransferOrderByWithRelationInput);

    const where: Prisma.TransferWhereInput = { tenantId };
    if (status) where.status = status;
    if (fromLocationId) where.fromLocationId = fromLocationId;
    if (toLocationId) where.toLocationId = toLocationId;
    if (locationId) {
      where.OR = [{ fromLocationId: locationId }, { toLocationId: locationId }];
    }
    if (search) {
      where.OR = [
        ...(Array.isArray(where.OR) ? where.OR : []),
        { transferCode: { contains: search, mode: "insensitive" } },
        { fromLocation: { name: { contains: search, mode: "insensitive" } } },
        { toLocation: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const skip = (page - 1) * limit;
    const [totalItems, transfers] = await Promise.all([
      transfersRepository.countTransfers(where),
      transfersRepository.findTransfers({ where, orderBy, skip, take: limit }),
    ]);

    const pagination = createPaginationResult(
      transfers,
      totalItems,
      page,
      limit,
    );
    return { data: pagination.data, pagination: pagination.pagination };
  },

  async getById(id: string, tenantId: string) {
    const transfer = await transfersRepository.findTransferById(id, tenantId);
    if (!transfer) {
      throw new NotFoundError("Transfer not found");
    }
    return transfer;
  },

  async approve(id: string, tenantId: string, userId: string) {
    const transfer = await transfersRepository.findTransferWithItems(
      id,
      tenantId,
    );
    if (!transfer) {
      throw new NotFoundError("Transfer not found");
    }
    if (transfer.status !== "PENDING") {
      throw new DomainError(
        400,
        `Cannot approve transfer with status: ${transfer.status}`,
      );
    }

    const insufficientStock: Array<{
      product: string;
      color: string;
      subVariationId?: string;
      requested: number;
      available: number;
    }> = [];

    for (const item of transfer.items) {
      const sourceInventory = await transfersRepository.findInventory(
        transfer.fromLocationId,
        item.variationId,
        item.subVariationId ?? null,
      );
      const availableQuantity = sourceInventory?.quantity ?? 0;
      if (availableQuantity < item.quantity) {
        const productName = item.variation?.product?.name ?? "Unknown";
        insufficientStock.push({
          product: productName,
          color: (item.variation as { color?: string })?.color ?? "",
          subVariationId: item.subVariationId ?? undefined,
          requested: item.quantity,
          available: availableQuantity,
        });
      }
    }

    if (insufficientStock.length > 0) {
      throw new AppError(
        "Cannot approve: Insufficient stock for some items. Stock may have changed since transfer was created.",
        400,
        undefined,
        { insufficientStock },
      );
    }

    const updated = await transfersRepository.updateTransfer(id, {
      status: "APPROVED",
      approvedBy: { connect: { id: userId } },
      approvedAt: new Date(),
    });
    await transfersRepository.createTransferLog(id, "APPROVED", userId);
    return updated;
  },

  async startTransit(id: string, tenantId: string, userId: string) {
    const transfer = await transfersRepository.findTransferWithItems(
      id,
      tenantId,
    );
    if (!transfer) {
      throw new NotFoundError("Transfer not found");
    }
    if (transfer.status !== "APPROVED") {
      throw new DomainError(
        400,
        `Cannot start transit for transfer with status: ${transfer.status}. Transfer must be APPROVED first.`,
      );
    }

    const payload = {
      id: transfer.id,
      fromLocationId: transfer.fromLocationId,
      toLocationId: transfer.toLocationId,
      status: transfer.status,
      items: transfer.items.map((i) => ({
        variationId: i.variationId,
        subVariationId: i.subVariationId ?? null,
        quantity: i.quantity,
      })),
    };
    return transfersRepository.startTransitTransaction(payload, userId);
  },

  async complete(id: string, tenantId: string, userId: string) {
    const transfer = await transfersRepository.findTransferWithItems(
      id,
      tenantId,
    );
    if (!transfer) {
      throw new NotFoundError("Transfer not found");
    }
    if (transfer.status !== "IN_TRANSIT") {
      throw new DomainError(
        400,
        `Cannot complete transfer with status: ${transfer.status}. Transfer must be IN_TRANSIT.`,
      );
    }

    const payload = {
      id: transfer.id,
      fromLocationId: transfer.fromLocationId,
      toLocationId: transfer.toLocationId,
      status: transfer.status,
      items: transfer.items.map((i) => ({
        variationId: i.variationId,
        subVariationId: i.subVariationId ?? null,
        quantity: i.quantity,
      })),
    };
    return transfersRepository.completeTransferTransaction(payload, userId);
  },

  async cancel(id: string, tenantId: string, userId: string, reason?: string) {
    const transfer = await transfersRepository.findTransferWithItems(
      id,
      tenantId,
    );
    if (!transfer) {
      throw new NotFoundError("Transfer not found");
    }
    if (transfer.status === "COMPLETED") {
      throw new DomainError(400, "Cannot cancel a completed transfer");
    }
    if (transfer.status === "CANCELLED") {
      throw new DomainError(400, "Transfer is already cancelled");
    }

    const previousStatus = transfer.status;
    const payload = {
      id: transfer.id,
      fromLocationId: transfer.fromLocationId,
      toLocationId: transfer.toLocationId,
      status: transfer.status,
      items: transfer.items.map((i) => ({
        variationId: i.variationId,
        subVariationId: i.subVariationId ?? null,
        quantity: i.quantity,
      })),
    };
    const updated = await transfersRepository.cancelTransferTransaction(
      payload,
      userId,
      reason ?? "No reason provided",
    );
    return {
      transfer: updated,
      stockRestored: previousStatus === "IN_TRANSIT",
    };
  },

  async getTransferLogs(transferId: string, tenantId: string) {
    const transfer = await transfersRepository.findTransferById(
      transferId,
      tenantId,
    );
    if (!transfer) {
      throw new NotFoundError("Transfer not found");
    }
    const logs = await transfersRepository.findTransferLogs(transferId);
    return { transferCode: transfer.transferCode, logs };
  },
};
