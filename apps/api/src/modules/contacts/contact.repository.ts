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
  sales: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      saleCode: true,
      total: true,
      type: true,
      createdAt: true,
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
  private async ensureSalesSource(contactId: string): Promise<void> {
    await prisma.contact.updateMany({
      where: {
        id: contactId,
        OR: [{ source: null }, { source: "" }],
      },
      data: { source: "Sales" },
    });
  }

  async findAll(tenantId: string, query: Record<string, unknown>) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(query);
    const companyId = query.companyId as string | undefined;
    const tagId = query.tagId as string | undefined;
    const ownerId = query.ownerId as string | undefined;
    const source = query.source as string | undefined;
    const journeyType = query.journeyType as string | undefined;

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
    if (source) where.source = source;
    if (journeyType) where.journeyType = journeyType;

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
        gender: data.gender?.trim() || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
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
        ...(data.gender !== undefined && {
          gender: data.gender?.trim() || null,
        }),
        ...(data.birthDate !== undefined && {
          birthDate: data.birthDate ? new Date(data.birthDate) : null,
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

  async softDelete(
    id: string,
    data: { deletedBy: string; deleteReason?: string | null },
  ) {
    return prisma.contact.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: data.deletedBy,
        deleteReason: data.deleteReason ?? undefined,
      },
    });
  }

  async countTags(tenantId: string, search?: string) {
    const where: {
      tenantId: string;
      name?: { contains: string; mode: "insensitive" };
    } = { tenantId };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    return prisma.contactTag.count({ where });
  }

  async findTags(tenantId: string) {
    return prisma.contactTag.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, createdAt: true },
    });
  }

  async findTagsPaginated(
    tenantId: string,
    skip: number,
    take: number,
    search?: string,
  ) {
    const where: {
      tenantId: string;
      name?: { contains: string; mode: "insensitive" };
    } = { tenantId };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    return prisma.contactTag.findMany({
      where,
      orderBy: { name: "asc" },
      select: { id: true, name: true, createdAt: true },
      skip,
      take,
    });
  }

  async updateTag(id: string, tenantId: string, name: string) {
    const existing = await prisma.contactTag.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return null;
    return prisma.contactTag.update({
      where: { id },
      data: { name: name.trim() },
    });
  }

  async deleteTag(id: string, tenantId: string) {
    const existing = await prisma.contactTag.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return null;
    await prisma.contactTag.delete({ where: { id } });
    return existing;
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

  /** Find or create contact from member (for sale flow — auto-create when sale has phone). */
  async findOrCreateFromMember(
    tenantId: string,
    member: { id: string; phone: string; name?: string | null },
    createdById: string,
  ) {
    const existing = await prisma.contact.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        OR: [{ memberId: member.id }, { phone: member.phone }],
      },
      select: { id: true },
    });
    if (existing) {
      await this.ensureSalesSource(existing.id);
      return existing;
    }
    const nameParts = (member.name || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;
    return prisma.contact.create({
      data: {
        tenantId,
        firstName,
        lastName,
        phone: member.phone,
        memberId: member.id,
        source: "Sales",
        ownedById: createdById,
        createdById,
      },
      select: { id: true },
    });
  }

  async createFromSale(
    tenantId: string,
    data: {
      phone: string;
      name?: string | null;
      memberId: string;
      createdById: string;
    },
  ) {
    const nameParts = (data.name || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;
    return prisma.contact.create({
      data: {
        tenantId,
        firstName,
        lastName,
        phone: data.phone,
        memberId: data.memberId,
        source: "Sales",
        ownedById: data.createdById,
        createdById: data.createdById,
      },
      select: { id: true },
    });
  }

  /** Find or create contact from sale info (phone + optional name, no member required). */
  async findOrCreateFromSaleInfo(
    tenantId: string,
    data: { phone: string; name?: string | null },
    createdById: string,
  ) {
    const existing = await prisma.contact.findFirst({
      where: { tenantId, deletedAt: null, phone: data.phone },
      select: { id: true },
    });
    if (existing) {
      await this.ensureSalesSource(existing.id);
      return existing;
    }
    const nameParts = (data.name || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;
    return prisma.contact.create({
      data: {
        tenantId,
        firstName,
        lastName,
        phone: data.phone,
        source: "Sales",
        ownedById: createdById,
        createdById,
      },
      select: { id: true },
    });
  }

  async incrementPurchaseCount(contactId: string) {
    return prisma.contact.update({
      where: { id: contactId },
      data: { purchaseCount: { increment: 1 } },
      select: { id: true, purchaseCount: true },
    });
  }

  /** Link contact to an existing tag by name (tenant-scoped). No-op if tag does not exist. */
  async linkExistingTagToContact(
    tenantId: string,
    contactId: string,
    tagName: string,
  ): Promise<boolean> {
    const tag = await prisma.contactTag.findUnique({
      where: { tenantId_name: { tenantId, name: tagName } },
    });
    if (!tag) return false;
    await prisma.contactTagLink.upsert({
      where: { contactId_tagId: { contactId, tagId: tag.id } },
      create: { contactId, tagId: tag.id },
      update: {},
    });
    return true;
  }

  /** Remove tag link by name. No-op if tag does not exist. */
  async unlinkTagFromContact(
    tenantId: string,
    contactId: string,
    tagName: string,
  ): Promise<void> {
    const tag = await prisma.contactTag.findUnique({
      where: { tenantId_name: { tenantId, name: tagName } },
    });
    if (!tag) return;
    await prisma.contactTagLink.deleteMany({
      where: { contactId, tagId: tag.id },
    });
  }

  /** Workflow automation — allowlisted scalar fields only. */
  async updateContactByWorkflow(
    tenantId: string,
    contactId: string,
    data: { source?: string | null; journeyType?: string | null },
  ): Promise<void> {
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return;
    const patch: { source?: string | null; journeyType?: string | null } = {};
    if (data.source !== undefined) patch.source = data.source;
    if (data.journeyType !== undefined) patch.journeyType = data.journeyType;
    if (Object.keys(patch).length === 0) return;
    await prisma.contact.update({ where: { id: contactId }, data: patch });
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
