import type { Prisma } from "@prisma/client";
import prisma from "@/config/prisma";

function generateTransferCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TRF-${timestamp}-${random}`;
}

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
            select: {
              id: true,
              name: true,
              imsCode: true,
              category: true,
            },
          },
          attributes: {
            include: {
              attributeType: { select: { name: true } },
              attributeValue: { select: { value: true } },
            },
          },
          photos: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
  },
  logs: {
    include: {
      user: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
} as const;

const transferWithItemsInclude = {
  fromLocation: true,
  toLocation: true,
  createdBy: { select: { id: true, username: true, role: true } },
  approvedBy: { select: { id: true, username: true } },
  items: {
    include: {
      variation: {
        include: {
          product: { select: { id: true, name: true, imsCode: true } },
          attributes: {
            include: {
              attributeType: { select: { name: true } },
              attributeValue: { select: { value: true } },
            },
          },
        },
      },
      subVariation: { select: { id: true, name: true } },
    },
  },
} as const;

export type TransferWhere = Prisma.TransferWhereInput;

export interface CreateTransferRepoData {
  tenantId: string;
  fromLocationId: string;
  toLocationId: string;
  createdById: string;
  notes: string | null;
  items: Array<{
    variationId: string;
    subVariationId: string | null;
    quantity: number;
  }>;
}

export class TransferRepository {
  async findLocationById(id: string) {
    return prisma.location.findUnique({ where: { id } });
  }

  async findVariationWithSubVariations(id: string) {
    return prisma.productVariation.findUnique({
      where: { id },
      include: {
        subVariations: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, imsCode: true } },
      },
    });
  }

  async findInventory(
    locationId: string,
    variationId: string,
    subVariationId: string | null,
  ) {
    return prisma.locationInventory.findFirst({
      where: {
        locationId,
        variationId,
        subVariationId,
      },
    });
  }

  async createTransfer(data: CreateTransferRepoData) {
    return prisma.transfer.create({
      data: {
        tenantId: data.tenantId,
        transferCode: generateTransferCode(),
        fromLocationId: data.fromLocationId,
        toLocationId: data.toLocationId,
        status: "PENDING",
        notes: data.notes,
        createdById: data.createdById,
        items: {
          create: data.items.map((item) => ({
            variationId: item.variationId,
            subVariationId: item.subVariationId,
            quantity: item.quantity,
          })),
        },
      },
      include: transferWithItemsInclude,
    });
  }

  async createTransferLog(
    transferId: string,
    action: string,
    userId: string,
    details?: Record<string, unknown>,
  ) {
    return prisma.transferLog.create({
      data: {
        transferId,
        action,
        userId,
        details: details ?? null,
      },
    });
  }

  async countTransfers(where: TransferWhere) {
    return prisma.transfer.count({ where });
  }

  async findManyTransfers(
    where: TransferWhere,
    skip: number,
    take: number,
    orderBy: Record<string, "asc" | "desc">,
  ) {
    return prisma.transfer.findMany({
      where,
      skip,
      take,
      orderBy,
      include: transferListInclude,
    });
  }

  async findTransferById(id: string) {
    return prisma.transfer.findUnique({
      where: { id },
      include: transferDetailInclude,
    });
  }

  async findTransferWithItems(id: string) {
    return prisma.transfer.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variation: {
              include: {
                product: { select: { name: true, imsCode: true } },
              },
            },
          },
        },
      },
    });
  }

  async updateTransferApprove(
    id: string,
    approvedById: string,
    approvedAt: Date,
  ) {
    return prisma.transfer.update({
      where: { id },
      data: { status: "APPROVED", approvedById, approvedAt },
      include: transferWithItemsInclude,
    });
  }

  async updateTransferStatus(
    id: string,
    data: { status: "IN_TRANSIT" } | { status: "COMPLETED"; completedAt: Date },
  ) {
    return prisma.transfer.update({
      where: { id },
      data,
      include: transferWithItemsInclude,
    });
  }

  async updateTransferCancel(id: string) {
    return prisma.transfer.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: transferWithItemsInclude,
    });
  }

  async decrementInventory(inventoryId: string, quantity: number) {
    return prisma.locationInventory.update({
      where: { id: inventoryId },
      data: { quantity: { decrement: quantity } },
    });
  }

  async incrementInventory(inventoryId: string, quantity: number) {
    return prisma.locationInventory.update({
      where: { id: inventoryId },
      data: { quantity: { increment: quantity } },
    });
  }

  async createInventory(data: {
    locationId: string;
    variationId: string;
    subVariationId: string | null;
    quantity: number;
  }) {
    return prisma.locationInventory.create({
      data,
    });
  }

  async findTransferLogs(transferId: string) {
    return prisma.transferLog.findMany({
      where: { transferId },
      include: {
        user: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export default new TransferRepository();
