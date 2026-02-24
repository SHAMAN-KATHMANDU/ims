/**
 * Transfers repository - database access for transfers module.
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

export type TransferItemInput = {
  variationId: string;
  subVariationId: string | null;
  quantity: number;
};

export type CreateTransferParams = {
  tenantId: string;
  userId: string;
  transferCode: string;
  fromLocationId: string;
  toLocationId: string;
  notes: string | null;
  items: TransferItemInput[];
  fromLocationName: string;
  toLocationName: string;
  ip?: string;
  userAgent?: string;
};

type TransferWithItemsForTransit = {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  status: string;
  items: Array<{
    variationId: string;
    subVariationId: string | null;
    quantity: number;
  }>;
};

const transferListInclude = {
  fromLocation: { select: { id: true, name: true, type: true } },
  toLocation: { select: { id: true, name: true, type: true } },
  createdBy: { select: { id: true, username: true } },
  approvedBy: { select: { id: true, username: true } },
  _count: { select: { items: true } },
} as const;

const transferDetailInclude = {
  fromLocation: true,
  toLocation: true,
  createdBy: { select: { id: true, username: true, role: true } },
  approvedBy: { select: { id: true, username: true, role: true } },
  items: {
    include: {
      variation: {
        include: {
          product: {
            select: { id: true, name: true, imsCode: true, category: true },
          },
          photos: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
  },
  logs: {
    include: { user: { select: { id: true, username: true } } },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

const transferWithItemsInclude = {
  fromLocation: true,
  toLocation: true,
  createdBy: { select: { id: true, username: true } },
  approvedBy: { select: { id: true, username: true } },
  items: {
    include: {
      variation: {
        include: {
          product: { select: { id: true, name: true, imsCode: true } },
        },
      },
      subVariation: { select: { id: true, name: true } },
    },
  },
} as const;

export const transfersRepository = {
  findLocationById(id: string) {
    return prisma.location.findUnique({
      where: { id },
    });
  },

  findVariationForTransfer(variationId: string) {
    return prisma.productVariation.findUnique({
      where: { id: variationId },
      include: {
        subVariations: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, imsCode: true } },
      },
    });
  },

  findInventory(
    locationId: string,
    variationId: string,
    subVariationId: string | null,
  ) {
    return prisma.locationInventory.findFirst({
      where: {
        locationId,
        variationId,
        subVariationId: subVariationId ?? null,
      },
    });
  },

  findTransfers(params: {
    where: Prisma.TransferWhereInput;
    orderBy: Prisma.TransferOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.transfer.findMany({
      where: params.where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: transferListInclude,
    });
  },

  countTransfers(where: Prisma.TransferWhereInput) {
    return prisma.transfer.count({ where });
  },

  findTransferById(id: string, tenantId?: string) {
    return prisma.transfer.findFirst({
      where: tenantId ? { id, tenantId } : { id },
      include: transferDetailInclude,
    });
  },

  findTransferWithItems(id: string, tenantId?: string) {
    return prisma.transfer.findFirst({
      where: tenantId ? { id, tenantId } : { id },
      include: {
        items: {
          include: {
            variation: {
              include: { product: { select: { name: true } } },
            },
          },
        },
      },
    });
  },

  createTransfer(data: Prisma.TransferCreateInput) {
    return prisma.transfer.create({
      data,
      include: {
        fromLocation: true,
        toLocation: true,
        createdBy: { select: { id: true, username: true, role: true } },
        items: {
          include: {
            variation: {
              include: {
                product: { select: { id: true, name: true, imsCode: true } },
              },
            },
            subVariation: { select: { id: true, name: true } },
          },
        },
      },
    });
  },

  updateTransfer(id: string, data: Prisma.TransferUpdateInput) {
    return prisma.transfer.update({
      where: { id },
      data,
      include: transferWithItemsInclude,
    });
  },

  createTransferLog(
    transferId: string,
    action: string,
    userId: string,
    details?: Prisma.InputJsonValue,
  ) {
    return prisma.transferLog.create({
      data: { transferId, action, userId, details: details ?? null },
    });
  },

  createAuditLog(data: Prisma.AuditLogCreateInput) {
    return prisma.auditLog.create({ data });
  },

  updateInventoryQuantity(id: string, delta: number) {
    return prisma.locationInventory.update({
      where: { id },
      data: {
        quantity: { [delta >= 0 ? "increment" : "decrement"]: Math.abs(delta) },
      },
    });
  },

  createInventoryRow(data: Prisma.LocationInventoryCreateInput) {
    return prisma.locationInventory.create({ data });
  },

  findTransferLogs(transferId: string) {
    return prisma.transferLog.findMany({
      where: { transferId },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  createTransferWithItemsAndLog(params: CreateTransferParams) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.transfer.create({
        data: {
          tenantId: params.tenantId,
          transferCode: params.transferCode,
          fromLocationId: params.fromLocationId,
          toLocationId: params.toLocationId,
          status: "PENDING",
          notes: params.notes,
          createdById: params.userId,
          items: {
            create: params.items.map((item) => ({
              variationId: item.variationId,
              subVariationId: item.subVariationId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          fromLocation: true,
          toLocation: true,
          createdBy: { select: { id: true, username: true, role: true } },
          items: {
            include: {
              variation: {
                include: {
                  product: { select: { id: true, name: true, imsCode: true } },
                },
              },
              subVariation: { select: { id: true, name: true } },
            },
          },
        },
      });

      await tx.transferLog.create({
        data: {
          transferId: created.id,
          action: "CREATED",
          userId: params.userId,
          details: {
            fromLocation: params.fromLocationName,
            toLocation: params.toLocationName,
            itemCount: params.items.length,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId,
          action: "CREATE_TRANSFER",
          resource: "transfer",
          resourceId: created.id,
          details: {
            transferCode: created.transferCode,
            fromLocationId: params.fromLocationId,
            toLocationId: params.toLocationId,
          },
          ip: params.ip ?? undefined,
          userAgent: params.userAgent ?? undefined,
        },
      });

      return created;
    });
  },

  async startTransitTransaction(
    transfer: TransferWithItemsForTransit,
    userId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        const row = await tx.locationInventory.findFirst({
          where: {
            locationId: transfer.fromLocationId,
            variationId: item.variationId,
            subVariationId: item.subVariationId ?? null,
          },
        });
        if (!row) throw new Error("Source inventory row not found");
        await tx.locationInventory.update({
          where: { id: row.id },
          data: { quantity: { decrement: item.quantity } },
        });
      }
      const updated = await tx.transfer.update({
        where: { id: transfer.id },
        data: { status: "IN_TRANSIT" },
        include: transferWithItemsInclude,
      });
      await tx.transferLog.create({
        data: {
          transferId: transfer.id,
          action: "IN_TRANSIT",
          userId,
          details: { message: "Stock deducted from source location" },
        },
      });
      return updated;
    });
  },

  async completeTransferTransaction(
    transfer: TransferWithItemsForTransit,
    userId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        const destRow = await tx.locationInventory.findFirst({
          where: {
            locationId: transfer.toLocationId,
            variationId: item.variationId,
            subVariationId: item.subVariationId ?? null,
          },
        });
        if (destRow) {
          await tx.locationInventory.update({
            where: { id: destRow.id },
            data: { quantity: { increment: item.quantity } },
          });
        } else {
          await tx.locationInventory.create({
            data: {
              locationId: transfer.toLocationId,
              variationId: item.variationId,
              subVariationId: item.subVariationId ?? null,
              quantity: item.quantity,
            },
          });
        }
      }
      const updated = await tx.transfer.update({
        where: { id: transfer.id },
        data: { status: "COMPLETED", completedAt: new Date() },
        include: transferWithItemsInclude,
      });
      await tx.transferLog.create({
        data: {
          transferId: transfer.id,
          action: "COMPLETED",
          userId,
          details: { message: "Stock added to destination location" },
        },
      });
      return updated;
    });
  },

  async cancelTransferTransaction(
    transfer: TransferWithItemsForTransit,
    userId: string,
    reason: string,
  ) {
    return prisma.$transaction(async (tx) => {
      if (transfer.status === "IN_TRANSIT") {
        for (const item of transfer.items) {
          const sourceRow = await tx.locationInventory.findFirst({
            where: {
              locationId: transfer.fromLocationId,
              variationId: item.variationId,
              subVariationId: item.subVariationId ?? null,
            },
          });
          if (sourceRow) {
            await tx.locationInventory.update({
              where: { id: sourceRow.id },
              data: { quantity: { increment: item.quantity } },
            });
          } else {
            await tx.locationInventory.create({
              data: {
                locationId: transfer.fromLocationId,
                variationId: item.variationId,
                subVariationId: item.subVariationId ?? null,
                quantity: item.quantity,
              },
            });
          }
        }
      }
      const updated = await tx.transfer.update({
        where: { id: transfer.id },
        data: { status: "CANCELLED" },
        include: {
          fromLocation: true,
          toLocation: true,
          createdBy: { select: { id: true, username: true } },
          approvedBy: { select: { id: true, username: true } },
        },
      });
      await tx.transferLog.create({
        data: {
          transferId: transfer.id,
          action: "CANCELLED",
          userId,
          details: {
            reason,
            previousStatus: transfer.status,
            stockRestored: transfer.status === "IN_TRANSIT",
          },
        },
      });
      return updated;
    });
  },
};
