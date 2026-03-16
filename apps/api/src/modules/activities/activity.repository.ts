import prisma from "@/config/prisma";

const ACTIVITY_CREATE_INCLUDE = {
  contact: { select: { id: true, firstName: true, lastName: true } },
  member: { select: { id: true, name: true, phone: true } },
  deal: { select: { id: true, name: true } },
  creator: { select: { id: true, username: true } },
} as const;

const ACTIVITY_BY_CONTACT_INCLUDE = {
  creator: { select: { id: true, username: true } },
  member: { select: { id: true, name: true, phone: true } },
  deal: { select: { id: true, name: true } },
} as const;

const ACTIVITY_BY_DEAL_INCLUDE = {
  creator: { select: { id: true, username: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  member: { select: { id: true, name: true, phone: true } },
} as const;

const ACTIVITY_DETAIL_INCLUDE = {
  contact: true,
  member: true,
  deal: true,
  creator: { select: { id: true, username: true } },
} as const;

export interface CreateActivityData {
  tenantId: string;
  type: "CALL" | "EMAIL" | "MEETING";
  subject: string | null;
  notes: string | null;
  activityAt: Date;
  contactId: string | null;
  memberId: string | null;
  dealId: string | null;
  createdById: string;
}

export class ActivityRepository {
  async create(data: CreateActivityData) {
    return prisma.activity.create({
      data,
      include: ACTIVITY_CREATE_INCLUDE,
    });
  }

  async countByContact(
    tenantId: string,
    contactId: string,
    type?: "CALL" | "EMAIL" | "MEETING",
  ) {
    const where: {
      tenantId: string;
      contactId: string;
      type?: "CALL" | "EMAIL" | "MEETING";
    } = { tenantId, contactId };
    if (type) where.type = type;
    return prisma.activity.count({ where });
  }

  async findByContact(
    tenantId: string,
    contactId: string,
    type?: "CALL" | "EMAIL" | "MEETING",
  ) {
    const where: {
      tenantId: string;
      contactId: string;
      type?: "CALL" | "EMAIL" | "MEETING";
    } = { tenantId, contactId };
    if (type) where.type = type;
    return prisma.activity.findMany({
      where,
      orderBy: { activityAt: "desc" },
      include: ACTIVITY_BY_CONTACT_INCLUDE,
    });
  }

  async findByContactPaginated(
    tenantId: string,
    contactId: string,
    skip: number,
    take: number,
    type?: "CALL" | "EMAIL" | "MEETING",
  ) {
    const where: {
      tenantId: string;
      contactId: string;
      type?: "CALL" | "EMAIL" | "MEETING";
    } = { tenantId, contactId };
    if (type) where.type = type;
    return prisma.activity.findMany({
      where,
      orderBy: { activityAt: "desc" },
      include: ACTIVITY_BY_CONTACT_INCLUDE,
      skip,
      take,
    });
  }

  async countByDeal(
    tenantId: string,
    dealId: string,
    type?: "CALL" | "EMAIL" | "MEETING",
  ) {
    const where: {
      tenantId: string;
      dealId: string;
      type?: "CALL" | "EMAIL" | "MEETING";
    } = { tenantId, dealId };
    if (type) where.type = type;
    return prisma.activity.count({ where });
  }

  async findByDeal(
    tenantId: string,
    dealId: string,
    type?: "CALL" | "EMAIL" | "MEETING",
  ) {
    const where: {
      tenantId: string;
      dealId: string;
      type?: "CALL" | "EMAIL" | "MEETING";
    } = { tenantId, dealId };
    if (type) where.type = type;
    return prisma.activity.findMany({
      where,
      orderBy: { activityAt: "desc" },
      include: ACTIVITY_BY_DEAL_INCLUDE,
    });
  }

  async findByDealPaginated(
    tenantId: string,
    dealId: string,
    skip: number,
    take: number,
    type?: "CALL" | "EMAIL" | "MEETING",
  ) {
    const where: {
      tenantId: string;
      dealId: string;
      type?: "CALL" | "EMAIL" | "MEETING";
    } = { tenantId, dealId };
    if (type) where.type = type;
    return prisma.activity.findMany({
      where,
      orderBy: { activityAt: "desc" },
      include: ACTIVITY_BY_DEAL_INCLUDE,
      skip,
      take,
    });
  }

  async findById(tenantId: string, id: string) {
    return prisma.activity.findFirst({
      where: { id, tenantId },
      include: ACTIVITY_DETAIL_INCLUDE,
    });
  }

  async softDelete(
    id: string,
    data: { deletedBy: string; deleteReason?: string | null },
  ) {
    return prisma.activity.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: data.deletedBy,
        deleteReason: data.deleteReason ?? undefined,
      },
    });
  }
}

export default new ActivityRepository();
