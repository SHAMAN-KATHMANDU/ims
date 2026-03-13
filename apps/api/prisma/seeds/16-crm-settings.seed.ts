import type { PrismaClient } from "@prisma/client";
import { deterministicId } from "./utils";
import type { SeedContext } from "./types";

const CRM_SOURCES = ["Website", "Referral", "Cold Call", "Trade Show"];
const CRM_JOURNEY_TYPES = ["New", "Nurturing", "Ready"];
const CONTACT_TAGS = ["VIP", "Hot Lead", "Follow Up"];

export async function seedCrmSettings(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const contactTagIds: Record<string, string> = {};

  for (const name of CRM_SOURCES) {
    await prisma.crmSource.upsert({
      where: { tenantId_name: { tenantId: ctx.tenantId, name } },
      create: { tenantId: ctx.tenantId, name },
      update: {},
    });
  }
  for (const name of CRM_JOURNEY_TYPES) {
    await prisma.crmJourneyType.upsert({
      where: { tenantId_name: { tenantId: ctx.tenantId, name } },
      create: { tenantId: ctx.tenantId, name },
      update: {},
    });
  }
  for (const name of CONTACT_TAGS) {
    const tag = await prisma.contactTag.upsert({
      where: { tenantId_name: { tenantId: ctx.tenantId, name } },
      create: { tenantId: ctx.tenantId, name },
      update: {},
    });
    contactTagIds[name] = tag.id;
  }

  const companyNames = [
    "Acme Corp",
    "Beta Solutions",
    "Gamma Industries",
    "Delta Ltd",
  ];
  const companyIds: string[] = [];
  for (const name of companyNames) {
    const id = deterministicId("company", `${ctx.tenantId}:${name}`);
    const company = await prisma.company.upsert({
      where: { id },
      create: {
        id,
        tenantId: ctx.tenantId,
        name,
        website: name === "Acme Corp" ? "https://acme.com" : null,
        phone: "01-4123456",
        address: name === "Acme Corp" ? "Kathmandu" : null,
      },
      update: { name },
    });
    companyIds.push(company.id);
  }

  return { ...ctx, contactTagIds, companyIds };
}
