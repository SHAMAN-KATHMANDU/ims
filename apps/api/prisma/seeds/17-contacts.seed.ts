import type { PrismaClient } from "@prisma/client";
import { deterministicId } from "./utils";
import type { SeedContext } from "./types";

const CONTACT_SPECS: Array<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyIndex: number;
  memberIndex?: number;
  source: string;
  journeyType: string;
  tagNames?: string[];
}> = [
  {
    firstName: "Ram",
    lastName: "Sharma",
    email: "ram@example.com",
    phone: "9800000001",
    companyIndex: 0,
    memberIndex: 0,
    source: "Website",
    journeyType: "Ready",
    tagNames: ["VIP"],
  },
  {
    firstName: "Sita",
    lastName: "Devi",
    email: "sita@example.com",
    phone: "9800000002",
    companyIndex: 0,
    memberIndex: 1,
    source: "Referral",
    journeyType: "Nurturing",
    tagNames: ["Hot Lead"],
  },
  {
    firstName: "Krishna",
    lastName: "Thapa",
    email: "krishna@example.com",
    phone: "9800000004",
    companyIndex: 1,
    memberIndex: 3,
    source: "Trade Show",
    journeyType: "New",
    tagNames: ["VIP"],
  },
  {
    firstName: "Anita",
    lastName: "Gurung",
    email: "anita@example.com",
    phone: "9800000005",
    companyIndex: 1,
    memberIndex: 4,
    source: "Cold Call",
    journeyType: "Ready",
  },
  {
    firstName: "Bikash",
    lastName: "Rai",
    email: "bikash@example.com",
    phone: "9800000006",
    companyIndex: 2,
    source: "Website",
    journeyType: "New",
    tagNames: ["Follow Up"],
  },
  {
    firstName: "Puja",
    lastName: "Maharjan",
    email: "puja@example.com",
    phone: "9800000007",
    companyIndex: 0,
    memberIndex: 6,
    source: "Referral",
    journeyType: "Ready",
  },
];

export async function seedContacts(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const ownedById = ctx.userIds["admin"] ?? Object.values(ctx.userIds)[0];
  const createdById = ownedById;
  if (!ownedById) throw new Error("seedUsers must run before seedContacts");

  const contactIds: string[] = [];
  for (let i = 0; i < CONTACT_SPECS.length; i++) {
    const c = CONTACT_SPECS[i];
    const companyId =
      c.companyIndex < ctx.companyIds.length
        ? ctx.companyIds[c.companyIndex]
        : null;
    const memberId =
      c.memberIndex !== undefined && c.memberIndex < ctx.memberIds.length
        ? ctx.memberIds[c.memberIndex]
        : null;
    const contactId = deterministicId("contact", `${ctx.tenantId}:${c.phone}`);

    const contact = await prisma.contact.upsert({
      where: { id: contactId },
      create: {
        id: contactId,
        tenantId: ctx.tenantId,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        companyId,
        memberId,
        ownedById,
        createdById,
        source: c.source,
        journeyType: c.journeyType,
      },
      update: {
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        companyId,
        memberId,
        source: c.source,
        journeyType: c.journeyType,
      },
    });
    contactIds.push(contact.id);

    if (c.tagNames) {
      for (const tagName of c.tagNames) {
        const tagId = ctx.contactTagIds[tagName];
        if (tagId) {
          await prisma.contactTagLink.upsert({
            where: { contactId_tagId: { contactId: contact.id, tagId } },
            create: { contactId: contact.id, tagId },
            update: {},
          });
        }
      }
    }

    const noteId = deterministicId("contactNote", `${contact.id}:1`);
    await prisma.contactNote.upsert({
      where: { id: noteId },
      create: {
        id: noteId,
        contactId: contact.id,
        content: `Note for ${c.firstName} - seeded.`,
        createdById,
      },
      update: { content: `Note for ${c.firstName} - seeded.` },
    });
  }

  return { ...ctx, contactIds };
}
