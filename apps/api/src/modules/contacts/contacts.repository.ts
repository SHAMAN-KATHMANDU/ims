/**
 * Contacts repository: all Prisma access for contacts, notes, attachments, communications, tags.
 * All queries are tenant-scoped; list/get exclude soft-deleted (deletedAt: null).
 */

import prisma from "@/config/prisma";
import type { Prisma } from "@prisma/client";

const contactNotDeleted = { deletedAt: null };

const listInclude = {
  company: { select: { id: true, name: true } },
  owner: { select: { id: true, username: true } },
  tagLinks: { include: { tag: { select: { id: true, name: true } } } },
  _count: { select: { deals: true, tasks: true } },
} as const;

export function findContacts(
  tenantId: string,
  where: Prisma.ContactWhereInput,
  orderBy: Prisma.ContactOrderByWithRelationInput,
  skip: number,
  take: number,
) {
  return prisma.contact.findMany({
    where: { ...where, tenantId, ...contactNotDeleted },
    orderBy,
    skip,
    take,
    include: listInclude,
  });
}

export function countContacts(
  tenantId: string,
  where: Prisma.ContactWhereInput,
) {
  return prisma.contact.count({
    where: { ...where, tenantId, ...contactNotDeleted },
  });
}

export function findContactById(tenantId: string, id: string) {
  return prisma.contact.findFirst({
    where: { id, tenantId, ...contactNotDeleted },
    include: {
      company: true,
      member: { select: { id: true, name: true, phone: true, email: true } },
      owner: { select: { id: true, username: true } },
      tagLinks: { include: { tag: { select: { id: true, name: true } } } },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { creator: { select: { id: true, username: true } } },
      },
      attachments: {
        orderBy: { createdAt: "desc" },
        include: { uploader: { select: { id: true, username: true } } },
      },
      communications: {
        orderBy: { createdAt: "desc" },
        include: { creator: { select: { id: true, username: true } } },
      },
      deals: {
        select: {
          id: true,
          name: true,
          value: true,
          stage: true,
          status: true,
          expectedCloseDate: true,
        },
      },
      tasks: {
        select: {
          id: true,
          title: true,
          dueDate: true,
          completed: true,
          assignedTo: { select: { id: true, username: true } },
        },
      },
    },
  });
}

export function findContactByIdForUpdate(tenantId: string, id: string) {
  return prisma.contact.findFirst({
    where: { id, tenantId, ...contactNotDeleted },
  });
}

export function createContact(data: {
  tenantId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  companyId: string | null;
  memberId: string | null;
  ownedById: string;
  createdById: string;
  tagIds?: string[];
}) {
  const { tagIds, ...rest } = data;
  return prisma.contact.create({
    data: {
      ...rest,
      tagLinks:
        Array.isArray(tagIds) && tagIds.length > 0
          ? {
              create: tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
    },
    include: {
      company: { select: { id: true, name: true } },
      owner: { select: { id: true, username: true } },
      tagLinks: { include: { tag: { select: { id: true, name: true } } } },
    },
  });
}

export async function updateContactWithTags(
  id: string,
  data: Prisma.ContactUpdateInput,
  tagIds: string[] | undefined,
) {
  await prisma.$transaction(async (tx) => {
    if (Array.isArray(tagIds)) {
      await tx.contactTagLink.deleteMany({ where: { contactId: id } });
      if (tagIds.length > 0) {
        await tx.contactTagLink.createMany({
          data: tagIds.map((tagId) => ({ contactId: id, tagId })),
        });
      }
    }
    await tx.contact.update({ where: { id }, data });
  });
}

export function findContactAfterUpdate(tenantId: string, id: string) {
  return prisma.contact.findFirst({
    where: { id, tenantId, ...contactNotDeleted },
    include: {
      company: { select: { id: true, name: true } },
      owner: { select: { id: true, username: true } },
      tagLinks: { include: { tag: { select: { id: true, name: true } } } },
    },
  });
}

export function softDeleteContact(id: string) {
  return prisma.contact.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export function createNote(
  contactId: string,
  content: string,
  createdById: string,
) {
  return prisma.contactNote.create({
    data: { contactId, content, createdById },
    include: { creator: { select: { id: true, username: true } } },
  });
}

export function findNote(noteId: string, contactId: string) {
  return prisma.contactNote.findFirst({
    where: { id: noteId, contactId },
  });
}

export function deleteNote(noteId: string) {
  return prisma.contactNote.delete({ where: { id: noteId } });
}

export function createAttachment(data: {
  contactId: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedById: string;
}) {
  return prisma.contactAttachment.create({
    data,
    include: { uploader: { select: { id: true, username: true } } },
  });
}

export function findAttachment(attachmentId: string, contactId: string) {
  return prisma.contactAttachment.findFirst({
    where: { id: attachmentId, contactId },
  });
}

export function deleteAttachment(attachmentId: string) {
  return prisma.contactAttachment.delete({ where: { id: attachmentId } });
}

export function createCommunication(data: {
  contactId: string;
  type: string;
  subject: string | null;
  notes: string | null;
  createdById: string;
}) {
  return prisma.contactCommunication.create({
    data: {
      contact: { connect: { id: data.contactId } },
      creator: { connect: { id: data.createdById } },
      type: data.type as "CALL" | "EMAIL" | "MEETING",
      subject: data.subject,
      notes: data.notes,
    },
    include: { creator: { select: { id: true, username: true } } },
  });
}

export function findTags(tenantId: string) {
  return prisma.contactTag.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function findTagByName(tenantId: string, name: string) {
  return prisma.contactTag.findFirst({
    where: { tenantId, name },
  });
}

export function createTag(tenantId: string, name: string) {
  return prisma.contactTag.create({
    data: { tenantId, name },
  });
}

export function findContactsForExport(tenantId: string, contactIds?: string[]) {
  const where: Prisma.ContactWhereInput = { tenantId, ...contactNotDeleted };
  if (contactIds?.length) where.id = { in: contactIds };
  return prisma.contact.findMany({
    where,
    include: {
      company: { select: { name: true } },
      tagLinks: { include: { tag: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function findCompanyByName(tenantId: string, name: string) {
  return prisma.company.findFirst({
    where: { tenantId, deletedAt: null, name },
    select: { id: true },
  });
}

export function createCompany(tenantId: string, name: string) {
  return prisma.company.create({
    data: { tenantId, name },
    select: { id: true },
  });
}
