import type { PrismaClient } from "@prisma/client";
import { deterministicTransferCode } from "./utils";
import type { SeedContext } from "./types";

export async function seedTransfers(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const warehouseId = ctx.locationIds["warehouse"];
  const showroomId = ctx.locationIds["showroom"];
  const outletId = ctx.locationIds["outlet"];
  const createdById = ctx.userIds["admin"] ?? Object.values(ctx.userIds)[0];
  if (!warehouseId || !showroomId || !outletId || !createdById)
    throw new Error(
      "seedLocations and seedUsers must run before seedTransfers",
    );

  const prefix = ctx.slug.toUpperCase();
  const now = new Date();
  const transferIds: string[] = [];

  const specs: Array<{
    from: string;
    to: string;
    status: "PENDING" | "APPROVED" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
    variationIndex: number;
    quantity: number;
    approved?: boolean;
    completed?: boolean;
  }> = [
    {
      from: "warehouse",
      to: "showroom",
      status: "COMPLETED",
      variationIndex: 0,
      quantity: 5,
      approved: true,
      completed: true,
    },
    {
      from: "warehouse",
      to: "outlet",
      status: "COMPLETED",
      variationIndex: 2,
      quantity: 10,
      approved: true,
      completed: true,
    },
    {
      from: "warehouse",
      to: "showroom",
      status: "PENDING",
      variationIndex: 5,
      quantity: 3,
    },
    {
      from: "showroom",
      to: "outlet",
      status: "IN_TRANSIT",
      variationIndex: 1,
      quantity: 2,
      approved: true,
    },
    {
      from: "warehouse",
      to: "outlet",
      status: "COMPLETED",
      variationIndex: 10,
      quantity: 8,
      approved: true,
      completed: true,
    },
  ];

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const transferCode = deterministicTransferCode(prefix, i + 1);
    const fromId = ctx.locationIds[spec.from];
    const toId = ctx.locationIds[spec.to];
    const variationId = ctx.variationIds[spec.variationIndex];

    const transfer = await prisma.transfer.upsert({
      where: {
        tenantId_transferCode: { tenantId: ctx.tenantId, transferCode },
      },
      create: {
        tenantId: ctx.tenantId,
        transferCode,
        fromLocationId: fromId,
        toLocationId: toId,
        status: spec.status,
        notes: `Seed transfer ${i + 1}`,
        createdById,
        approvedById: spec.approved ? createdById : null,
        approvedAt: spec.approved ? now : null,
        completedAt: spec.completed ? now : null,
      },
      update: {
        status: spec.status,
        approvedById: spec.approved ? createdById : null,
        approvedAt: spec.approved ? now : null,
        completedAt: spec.completed ? now : null,
      },
    });
    transferIds.push(transfer.id);

    await prisma.transferItem.deleteMany({
      where: { transferId: transfer.id },
    });
    await prisma.transferItem.create({
      data: {
        transferId: transfer.id,
        variationId,
        subVariationId: null,
        quantity: spec.quantity,
      },
    });

    await prisma.transferLog.deleteMany({ where: { transferId: transfer.id } });
    await prisma.transferLog.create({
      data: {
        transferId: transfer.id,
        action: "created",
        details: {},
        userId: createdById,
      },
    });
  }

  return { ...ctx, transferIds };
}
