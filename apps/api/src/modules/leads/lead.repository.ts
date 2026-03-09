import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";

const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "LOST",
  "CONVERTED",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

const LEAD_LIST_INCLUDE = {
  assignedTo: { select: { id: true, username: true } },
  creator: { select: { id: true, username: true } },
} as const;

const LEAD_DETAIL_INCLUDE = {
  assignedTo: { select: { id: true, username: true } },
  creator: { select: { id: true, username: true } },
  convertedDeal: true,
} as const;

export interface CreateLeadData {
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  status: LeadStatus;
  source: string | null;
  notes: string | null;
  assignedToId: string;
  createdById: string;
}

export interface UpdateLeadData {
  name?: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  status?: LeadStatus;
  source?: string | null;
  notes?: string | null;
  assignedToId?: string;
}

export interface FindAllLeadsParams {
  tenantId: string;
  query: Record<string, unknown>;
}

export class LeadRepository {
  async create(data: CreateLeadData) {
    return prisma.lead.create({
      data,
      include: LEAD_LIST_INCLUDE,
    });
  }

  async findAll(tenantId: string, query: Record<string, unknown>) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(query);
    const status = query.status as string | undefined;
    const source = query.source as string | undefined;
    const assignedToId = query.assignedToId as string | undefined;

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "name",
      "status",
      "id",
    ];
    const orderBy = getPrismaOrderBy(sortBy, sortOrder, allowedSortFields) || {
      createdAt: "desc",
    };

    const where: Record<string, unknown> = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status && LEAD_STATUSES.includes(status as LeadStatus)) {
      where.status = status;
    }
    if (source) where.source = source;
    if (assignedToId) where.assignedToId = assignedToId;

    const skip = (page - 1) * limit;

    const [totalItems, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: LEAD_LIST_INCLUDE,
      }),
    ]);

    return createPaginationResult(leads, totalItems, page, limit);
  }

  async findById(tenantId: string, id: string) {
    return prisma.lead.findFirst({
      where: { id, tenantId },
      include: LEAD_DETAIL_INCLUDE,
    });
  }

  async update(id: string, data: UpdateLeadData) {
    return prisma.lead.update({
      where: { id },
      data,
      include: LEAD_LIST_INCLUDE,
    });
  }

  async softDelete(
    id: string,
    data: { deletedBy: string; deleteReason?: string | null },
  ) {
    return prisma.lead.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: data.deletedBy,
        deleteReason: data.deleteReason ?? undefined,
      },
    });
  }

  async findDefaultPipeline(tenantId: string) {
    return prisma.pipeline.findFirst({
      where: { tenantId, isDefault: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async findPipelineById(tenantId: string, pipelineId: string) {
    return prisma.pipeline.findFirst({
      where: { id: pipelineId, tenantId },
    });
  }

  async findMemberByPhone(tenantId: string, phone: string) {
    return prisma.member.findFirst({
      where: { tenantId, phone, deletedAt: null },
      select: { id: true },
    });
  }

  async createMember(data: {
    tenantId: string;
    phone: string;
    name: string | null;
    email: string | null;
  }) {
    return prisma.member.create({
      data,
      select: { id: true },
    });
  }

  async findContactById(tenantId: string, contactId: string) {
    return prisma.contact.findFirst({
      where: { id: contactId, tenantId, deletedAt: null },
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

  async createContact(data: {
    tenantId: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    companyId: string | null;
    memberId: string | null;
    ownedById: string;
    createdById: string;
  }) {
    return prisma.contact.create({ data });
  }

  async createDeal(data: {
    tenantId: string;
    name: string;
    value: number;
    stage: string;
    probability: number;
    status: "OPEN";
    contactId: string;
    memberId?: string;
    companyId: string | null;
    pipelineId: string;
    assignedToId: string;
    createdById: string;
    leadId: string;
  }) {
    return prisma.deal.create({
      data,
      include: {
        contact: true,
        member: true,
        company: true,
        pipeline: true,
        assignedTo: { select: { id: true, username: true } },
      },
    });
  }

  async markLeadConverted(id: string) {
    return prisma.lead.update({
      where: { id },
      data: { status: "CONVERTED", convertedAt: new Date() },
    });
  }

  async findLeadByIdWithDeal(id: string) {
    return prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, username: true } },
        convertedDeal: true,
      },
    });
  }

  async createNotification(data: {
    userId: string;
    type: "LEAD_ASSIGNMENT";
    title: string;
    message: string;
    resourceType: string;
    resourceId: string;
  }) {
    return prisma.notification.create({ data });
  }
}

export default new LeadRepository();
