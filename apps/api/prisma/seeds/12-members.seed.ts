import type { PrismaClient } from "@prisma/client";
import type { SeedContext } from "./types";
import { MEMBER_SPECS } from "./data/members";

export async function seedMembers(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const memberIds: string[] = [];
  const now = new Date();

  for (const m of MEMBER_SPECS) {
    const phone = ctx.slug === "demo" ? m.phone : `${m.phone}-${ctx.slug}`;
    const member = await prisma.member.upsert({
      where: {
        tenantId_phone: { tenantId: ctx.tenantId, phone },
      },
      create: {
        tenantId: ctx.tenantId,
        phone,
        name: m.name,
        email: m.email ?? null,
        notes: m.notes ?? null,
        isActive: m.memberStatus !== "INACTIVE",
        memberStatus: m.memberStatus,
        totalSales: 0,
        memberSince: now,
      },
      update: {
        name: m.name,
        email: m.email ?? null,
        notes: m.notes ?? null,
        memberStatus: m.memberStatus,
        isActive: m.memberStatus !== "INACTIVE",
      },
    });
    memberIds.push(member.id);
  }

  return { ...ctx, memberIds };
}
