import type { PrismaClient } from "@prisma/client";
import type { SeedContext } from "./types";

/**
 * Aggregate total sales per member from seeded sales and update Member.totalSales.
 */
export async function seedMemberTotals(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const aggregates = await prisma.sale.groupBy({
    by: ["memberId"],
    where: {
      tenantId: ctx.tenantId,
      memberId: { not: null },
    },
    _sum: { total: true },
  });

  for (const row of aggregates) {
    if (!row.memberId || row._sum.total == null) continue;
    await prisma.member.update({
      where: { id: row.memberId },
      data: { totalSales: row._sum.total },
    });
  }
  return ctx;
}
