import type { PrismaClient } from "@prisma/client";
import { deterministicId } from "./utils";
import type { SeedContext } from "./types";

const now = new Date();

const ACTIVITY_SPECS: Array<{
  type: "CALL" | "EMAIL" | "MEETING";
  subject: string;
  notes?: string;
  contactIndex?: number;
  dealIndex?: number;
}> = [
  {
    type: "CALL",
    subject: "Discovery call",
    notes: "Discussed requirements.",
    contactIndex: 0,
    dealIndex: 0,
  },
  { type: "MEETING", subject: "Showroom visit", contactIndex: 2 },
  { type: "CALL", subject: "Negotiation call", dealIndex: 3 },
  { type: "EMAIL", subject: "Proposal sent", contactIndex: 1 },
];

export async function seedActivities(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const createdById = ctx.userIds["admin"] ?? Object.values(ctx.userIds)[0];
  if (!createdById) throw new Error("seedUsers must run before seedActivities");

  const activityIds: string[] = [];
  for (let i = 0; i < ACTIVITY_SPECS.length; i++) {
    const a = ACTIVITY_SPECS[i];
    const contactId =
      a.contactIndex !== undefined && a.contactIndex < ctx.contactIds.length
        ? ctx.contactIds[a.contactIndex]
        : null;
    const dealId =
      a.dealIndex !== undefined && a.dealIndex < ctx.dealIds.length
        ? ctx.dealIds[a.dealIndex]
        : null;

    const id = deterministicId("activity", `${ctx.tenantId}:${i}:${a.subject}`);
    const activity = await prisma.activity.upsert({
      where: { id },
      create: {
        id,
        tenantId: ctx.tenantId,
        type: a.type,
        subject: a.subject,
        notes: a.notes ?? null,
        activityAt: now,
        contactId,
        dealId,
        createdById,
      },
      update: {},
    });
    activityIds.push(activity.id);
  }
  return { ...ctx, activityIds };
}
