import type { PrismaClient } from "@prisma/client";
import type { SeedContext } from "./types";

/**
 * Distribute variation stock across locations and set variation.stockQuantity.
 * Recreates location inventory for seeded variations (delete then create) to avoid null in unique.
 */
export async function seedInventory(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const warehouseId = ctx.locationIds["warehouse"];
  const showroomId = ctx.locationIds["showroom"];
  const outletId = ctx.locationIds["outlet"];
  if (!warehouseId || !showroomId || !outletId)
    throw new Error("seedLocations must run before seedInventory");

  await prisma.locationInventory.deleteMany({
    where: { variationId: { in: ctx.variationIds } },
  });

  const rows: Array<{
    locationId: string;
    variationId: string;
    subVariationId: string | null;
    quantity: number;
  }> = [];
  const quantitiesByVariation: Record<string, number> = {};

  for (let i = 0; i < ctx.variationIds.length; i++) {
    const variationId = ctx.variationIds[i];
    const totalStock = 15 + (i % 50);
    const wh = Math.floor(totalStock * 0.6);
    const show = Math.floor(totalStock * 0.25);
    const out = totalStock - wh - show;
    rows.push(
      {
        locationId: warehouseId,
        variationId,
        subVariationId: null,
        quantity: wh,
      },
      {
        locationId: showroomId,
        variationId,
        subVariationId: null,
        quantity: show,
      },
      {
        locationId: outletId,
        variationId,
        subVariationId: null,
        quantity: out,
      },
    );
    quantitiesByVariation[variationId] = totalStock;
  }

  await prisma.locationInventory.createMany({ data: rows });

  for (const [variationId, qty] of Object.entries(quantitiesByVariation)) {
    await prisma.productVariation.update({
      where: { id: variationId },
      data: { stockQuantity: qty },
    });
  }

  return ctx;
}
