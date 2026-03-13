import type { PrismaClient } from "@prisma/client";
import { deterministicId } from "./utils";
import type { SeedContext } from "./types";

const LEAD_SPECS: Array<{
  name: string;
  email?: string;
  phone?: string;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "LOST" | "CONVERTED";
  source: string;
  notes?: string;
}> = [
  {
    name: "New Prospect Alpha",
    email: "alpha@example.com",
    phone: "9811111111",
    status: "NEW",
    source: "Website",
    notes: "Filled form",
  },
  {
    name: "Prospect Beta",
    email: "beta@example.com",
    status: "CONTACTED",
    source: "Referral",
  },
  {
    name: "Prospect Gamma",
    email: "gamma@example.com",
    phone: "9811111113",
    status: "QUALIFIED",
    source: "Cold Call",
  },
  { name: "Lost Lead Delta", status: "LOST", source: "Website" },
  {
    name: "Converted Epsilon",
    email: "epsilon@example.com",
    status: "CONVERTED",
    source: "Website",
  },
];

export async function seedLeads(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const assignedToId = ctx.userIds["admin"] ?? Object.values(ctx.userIds)[0];
  const createdById = assignedToId;
  if (!assignedToId) throw new Error("seedUsers must run before seedLeads");

  const leadIds: string[] = [];
  const now = new Date();
  for (let i = 0; i < LEAD_SPECS.length; i++) {
    const spec = LEAD_SPECS[i];
    const id = deterministicId("lead", `${ctx.tenantId}:${i}:${spec.name}`);
    const lead = await prisma.lead.upsert({
      where: { id },
      create: {
        id,
        tenantId: ctx.tenantId,
        name: spec.name,
        email: spec.email ?? null,
        phone: spec.phone ?? null,
        status: spec.status,
        source: spec.source,
        notes: spec.notes ?? null,
        assignedToId,
        createdById,
        convertedAt: spec.status === "CONVERTED" ? now : null,
      },
      update: {
        status: spec.status,
        convertedAt: spec.status === "CONVERTED" ? now : null,
      },
    });
    leadIds.push(lead.id);
  }
  return { ...ctx, leadIds };
}
