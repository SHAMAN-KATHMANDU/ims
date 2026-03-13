import type { PrismaClient } from "@prisma/client";
import { deterministicId } from "./utils";
import { addDays } from "./utils";
import type { SeedContext } from "./types";

const now = new Date();

const DEAL_SPECS: Array<{
  name: string;
  value: number;
  stage: string;
  probability: number;
  status: "OPEN" | "WON" | "LOST";
  contactIndex?: number;
  memberIndex?: number;
  companyIndex?: number;
  leadIndex?: number;
  closedAt?: Date;
  lostReason?: string;
}> = [
  {
    name: "Acme Corp - Furniture Deal",
    value: 150000,
    stage: "Proposal",
    probability: 30,
    status: "OPEN",
    contactIndex: 0,
    memberIndex: 0,
    companyIndex: 0,
  },
  {
    name: "Epsilon - Enterprise Deal",
    value: 500000,
    stage: "Closed Won",
    probability: 100,
    status: "WON",
    companyIndex: 1,
    leadIndex: 4,
    closedAt: now,
  },
  {
    name: "Gamma - Lost Deal",
    value: 25000,
    stage: "Closed Lost",
    probability: 0,
    status: "LOST",
    contactIndex: 4,
    companyIndex: 2,
    lostReason: "Budget constraints",
  },
  {
    name: "Beta Solutions - Ongoing",
    value: 75000,
    stage: "Negotiation",
    probability: 60,
    status: "OPEN",
    contactIndex: 3,
    memberIndex: 4,
    companyIndex: 1,
  },
];

export async function seedDeals(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const assignedToId = ctx.userIds["admin"] ?? Object.values(ctx.userIds)[0];
  const createdById = assignedToId;
  if (!ctx.pipelineId || !assignedToId)
    throw new Error("seedPipelines and seedUsers must run before seedDeals");

  const dealIds: string[] = [];
  for (let i = 0; i < DEAL_SPECS.length; i++) {
    const d = DEAL_SPECS[i];
    const contactId =
      d.contactIndex !== undefined && d.contactIndex < ctx.contactIds.length
        ? ctx.contactIds[d.contactIndex]
        : null;
    const memberId =
      d.memberIndex !== undefined && d.memberIndex < ctx.memberIds.length
        ? ctx.memberIds[d.memberIndex]
        : null;
    const companyId =
      d.companyIndex !== undefined && d.companyIndex < ctx.companyIds.length
        ? ctx.companyIds[d.companyIndex]
        : null;
    const leadId =
      d.leadIndex !== undefined && d.leadIndex < ctx.leadIds.length
        ? ctx.leadIds[d.leadIndex]
        : null;

    const id = deterministicId("deal", `${ctx.tenantId}:${i}:${d.name}`);
    const deal = await prisma.deal.upsert({
      where: { id },
      create: {
        id,
        tenantId: ctx.tenantId,
        name: d.name,
        value: d.value,
        stage: d.stage,
        probability: d.probability,
        status: d.status,
        expectedCloseDate: d.status === "OPEN" ? addDays(now, 14) : null,
        closedAt: d.closedAt ?? null,
        lostReason: d.lostReason ?? null,
        contactId,
        memberId,
        companyId,
        pipelineId: ctx.pipelineId,
        assignedToId,
        createdById,
        leadId,
      },
      update: {
        stage: d.stage,
        probability: d.probability,
        status: d.status,
        closedAt: d.closedAt ?? null,
        lostReason: d.lostReason ?? null,
      },
    });
    dealIds.push(deal.id);

    if (i === 0 && ctx.productIds.length > 0) {
      await prisma.dealLineItem.deleteMany({ where: { dealId: deal.id } });
      await prisma.dealLineItem.create({
        data: {
          dealId: deal.id,
          productId: ctx.productIds[0],
          variationId:
            ctx.variationIdsByProductId[ctx.productIds[0]]?.[0] ?? null,
          quantity: 2,
          unitPrice: 75000,
        },
      });
    }
  }
  return { ...ctx, dealIds };
}
