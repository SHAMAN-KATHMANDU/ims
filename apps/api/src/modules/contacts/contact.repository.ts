import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import type {
  CreateContactDto,
  UpdateContactDto,
  AddCommunicationDto,
} from "./contact.schema";

const CONTACT_LIST_INCLUDE = {
  company: { select: { id: true, name: true } },
  owner: { select: { id: true, username: true } },
  member: { select: { id: true, name: true, phone: true, memberStatus: true } },
  tagLinks: { include: { tag: { select: { id: true, name: true } } } },
  _count: { select: { deals: true, tasks: true } },
  deals: {
    where: { status: "OPEN" as const, deletedAt: null },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { stage: true },
  },
} as const;

const CONTACT_DETAIL_INCLUDE = {
  company: true,
  member: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      memberStatus: true,
      totalSales: true,
      memberSince: true,
    },
  },
  owner: { select: { id: true, username: true } },
  tagLinks: { include: { tag: { select: { id: true, name: true } } } },
  notes: {
    orderBy: { createdAt: "desc" as const },
    include: { creator: { select: { id: true, username: true } } },
  },
  attachments: {
    orderBy: { createdAt: "desc" as const },
    include: { uploader: { select: { id: true, username: true } } },
  },
  communications: {
    orderBy: { createdAt: "desc" as const },
    include: { creator: { select: { id: true, username: true } } },
  },
  deals: {
    where: { deletedAt: null },
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
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      dueDate: true,
      completed: true,
      assignedTo: { select: { id: true, username: true } },
    },
  },
} as const;

export interface FindAllContactsParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  companyId?: string;
  tagId?: string;
  ownerId?: string;
}

export class ContactRepository {
  async findAll(tenantId: string, query: Record<string, unknown>) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(query);
    const companyId = query.companyId as string | undefined;
    const tagId = query.tagId as string | undefined;
    const ownerId = query.ownerId as string | undefined;

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "firstName",
      "lastName",
      "email",
      "id",
    ];
    const orderBy = getPrismaOrderBy(sortBy, sortOrder, allowedSortFields) || {
      createdAt: "desc",
    };

    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (companyId) where.companyId = companyId;
    if (tagId) where.tagLinks = { some: { tagId } };
    if (ownerId) where.ownedById = ownerId;

    const skip = (page - 1) * limit;

    const [totalItems, contacts] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: CONTACT_LIST_INCLUDE,
      }),
    ]);

    return createPaginationResult(contacts, totalItems, page, limit);
  }

  async findById(tenantId: string, id: string) {
    return prisma.contact.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: CONTACT_DETAIL_INCLUDE,
    });
  }

  async create(
    tenantId: string,
    data: CreateContactDto,
    userId: string,
    phoneNormalized: string | null,
  ) {
    return prisma.contact.create({
      data: {
        tenantId,
        firstName: data.firstName.trim(),
        lastName: data.lastName?.trim() || null,
        email: data.email?.trim() || null,
        phone: phoneNormalized,
        companyId: data.companyId || null,
        memberId: data.memberId || null,
        source: data.source || null,
        journeyType: data.journeyType || null,
        ownedById: userId,
        createdById: userId,
        tagLinks:
          Array.isArray(data.tagIds) && data.tagIds.length > 0
            ? {
                create: data.tagIds
                  .filter((id) => typeof id === "string")
                  .map((tagId) => ({ tagId })),
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

  async update(
    id: string,
    data: UpdateContactDto,
    phoneNormalized: string | null | undefined,
  ) {
    return prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        ...(data.firstName !== undefined && {
          firstName: data.firstName.trim(),
        }),
        ...(data.lastName !== undefined && {
          lastName: data.lastName?.trim() || null,
        }),
        ...(data.email !== undefined && { email: data.email?.trim() || null }),
        ...(phoneNormalized !== undefined && { phone: phoneNormalized }),
        ...(data.companyId !== undefined && {
          companyId: data.companyId || null,
        }),
        ...(data.memberId !== undefined && { memberId: data.memberId || null }),
        ...(data.source !== undefined && { source: data.source || null }),
        ...(data.journeyType !== undefined && {
          journeyType: data.journeyType || null,
        }),
      };

      if (Array.isArray(data.tagIds)) {
        await tx.contactTagLink.deleteMany({ where: { contactId: id } });
        if (data.tagIds.length > 0) {
          await tx.contactTagLink.createMany({
            data: data.tagIds
              .filter((tid) => typeof tid === "string")
              .map((tagId) => ({ contactId: id, tagId })),
          });
        }
      }

      await tx.contact.update({ where: { id }, data: updateData });
    });
  }

  async softDelete(id: string) {
    return prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findTags(tenantId: string) {
    return prisma.contactTag.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }

  async createTag(tenantId: string, name: string) {
    const existing = await prisma.contactTag.findUnique({
      where: { tenantId_name: { tenantId, name } },
    });
    if (existing) return { tag: existing, created: false };
    const tag = await prisma.contactTag.create({ data: { tenantId, name } });
    return { tag, created: true };
  }

  async addNote(contactId: string, content: string, userId: string) {
    return prisma.contactNote.create({
      data: { contactId, content: content.trim(), createdById: userId },
      include: { creator: { select: { id: true, username: true } } },
    });
  }

  async deleteNote(contactId: string, noteId: string) {
    const note = await prisma.contactNote.findFirst({
      where: { id: noteId, contactId },
    });
    if (!note) return null;
    await prisma.contactNote.delete({ where: { id: noteId } });
    return note;
  }

  async addAttachment(
    contactId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    const filePath =
      "attachments/" + (file.filename || file.originalname || "file");
    return prisma.contactAttachment.create({
      data: {
        contactId,
        fileName: file.originalname || file.filename || "file",
        filePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedById: userId,
      },
      include: { uploader: { select: { id: true, username: true } } },
    });
  }

  async deleteAttachment(contactId: string, attachmentId: string) {
    const attachment = await prisma.contactAttachment.findFirst({
      where: { id: attachmentId, contactId },
    });
    if (!attachment) return null;
    await prisma.contactAttachment.delete({ where: { id: attachmentId } });
    return attachment;
  }

  async addCommunication(
    contactId: string,
    data: AddCommunicationDto,
    userId: string,
  ) {
    return prisma.contactCommunication.create({
      data: {
        contactId,
        type: data.type,
        subject: data.subject?.trim() || null,
        notes: data.notes?.trim() || null,
        createdById: userId,
      },
      include: { creator: { select: { id: true, username: true } } },
    });
  }

  async findForExport(tenantId: string, contactIds?: string[]) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (contactIds && contactIds.length > 0) {
      where.id = { in: contactIds };
    }
    return prisma.contact.findMany({
      where,
      include: {
        company: { select: { name: true } },
        tagLinks: { include: { tag: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findCompanyByName(tenantId: string, name: string) {
    return prisma.company.findFirst({
      where: { tenantId, name },
      select: { id: true },
    });
  }

  async createCompany(tenantId: string, name: string) {
    return prisma.company.create({
      data: { tenantId, name },
      select: { id: true },
    });
  }

  async createContactForImport(
    tenantId: string,
    data: {
      firstName: string;
      lastName?: string | null;
      email?: string | null;
      phone?: string | null;
      companyId?: string | null;
    },
    userId: string,
  ) {
    return prisma.contact.create({
      data: {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName || null,
        email: data.email || null,
        phone: data.phone || null,
        companyId: data.companyId || null,
        ownedById: userId,
        createdById: userId,
      },
    });
  }

  async getAfterUpdate(id: string) {
    return prisma.contact.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, username: true } },
        tagLinks: { include: { tag: { select: { id: true, name: true } } } },
      },
    });
  }
}

export default new ContactRepository();
