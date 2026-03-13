import type { PrismaClient } from "@prisma/client";
import { deterministicSaleCode } from "./utils";
import type { SeedContext } from "./types";
import { generateSaleSpecs } from "./data/sales-generator";

export async function seedSales(
  prisma: PrismaClient,
  ctx: SeedContext,
  count: number = 110,
): Promise<SeedContext> {
  const createdById = ctx.userIds["admin"] ?? Object.values(ctx.userIds)[0];
  const specs = generateSaleSpecs(ctx, count);
  const saleIds: string[] = [];

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const saleCode = deterministicSaleCode(i + 1);
    const locationId = ctx.locationIds[spec.locationKey];
    const createdBy = ctx.userIds[spec.createdByKey] ?? createdById;
    const memberId =
      spec.memberIndex !== undefined ? ctx.memberIds[spec.memberIndex] : null;
    if (!locationId) throw new Error(`Missing location: ${spec.locationKey}`);

    let subtotal = 0;
    const itemRows: Array<{
      variationId: string;
      quantity: number;
      unitPrice: number;
      totalMrp: number;
      discountPercent: number;
      discountAmount: number;
      lineTotal: number;
    }> = [];
    for (const it of spec.items) {
      const totalMrp = it.quantity * it.unitPrice;
      const discountAmount = Math.round(totalMrp * (it.discountPercent / 100));
      const lineTotal = totalMrp - discountAmount;
      subtotal += lineTotal;
      itemRows.push({
        variationId: it.variationId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalMrp,
        discountPercent: it.discountPercent,
        discountAmount,
        lineTotal,
      });
    }
    const discount = 0;
    const total = subtotal - discount;

    const sale = await prisma.sale.upsert({
      where: {
        tenantId_saleCode: { tenantId: ctx.tenantId, saleCode },
      },
      create: {
        tenantId: ctx.tenantId,
        saleCode,
        type: spec.type,
        isCreditSale: false,
        locationId,
        memberId,
        subtotal,
        discount,
        promoDiscount: 0,
        total,
        createdById: createdBy,
      },
      update: {
        type: spec.type,
        locationId,
        memberId,
        subtotal,
        discount,
        total,
      },
    });
    saleIds.push(sale.id);

    await prisma.saleItem.deleteMany({ where: { saleId: sale.id } });
    await prisma.saleItem.createMany({
      data: itemRows.map((row) => ({
        saleId: sale.id,
        variationId: row.variationId,
        subVariationId: null,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        totalMrp: row.totalMrp,
        discountPercent: row.discountPercent,
        discountAmount: row.discountAmount,
        lineTotal: row.lineTotal,
      })),
    });

    await prisma.salePayment.deleteMany({ where: { saleId: sale.id } });
    await prisma.salePayment.create({
      data: {
        saleId: sale.id,
        method: spec.paymentMethod,
        amount: total,
      },
    });
  }

  return { ...ctx, saleIds };
}
