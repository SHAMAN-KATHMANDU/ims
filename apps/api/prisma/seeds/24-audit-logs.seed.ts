import type { PrismaClient } from "@prisma/client";
import type { SeedContext } from "./types";

export async function seedAuditLogs(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const userId = ctx.userIds["admin"] ?? Object.values(ctx.userIds)[0];
  if (!userId) return ctx;

  const entries = [
    {
      action: "tenant.seeded",
      resource: "tenant",
      resourceId: ctx.tenantId,
      details: { slug: ctx.slug },
    },
    { action: "sale.created", resource: "sale", resourceId: ctx.saleIds[0] },
    {
      action: "transfer.created",
      resource: "transfer",
      resourceId: ctx.transferIds[0],
    },
    {
      action: "product.created",
      resource: "product",
      resourceId: ctx.productIds[0],
    },
    {
      action: "member.created",
      resource: "member",
      resourceId: ctx.memberIds[0],
    },
    { action: "deal.created", resource: "deal", resourceId: ctx.dealIds[0] },
  ];

  for (const e of entries) {
    await prisma.auditLog.create({
      data: {
        tenantId: ctx.tenantId,
        userId,
        action: e.action,
        resource: e.resource,
        resourceId: e.resourceId,
        details: e.details ?? {},
      },
    });
  }
  return ctx;
}
