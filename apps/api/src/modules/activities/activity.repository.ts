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

  async findByContact(tenantId: string, contactId: string) {
    return prisma.activity.findMany({
      where: { tenantId, contactId },
      orderBy: { activityAt: "desc" },
      include: ACTIVITY_BY_CONTACT_INCLUDE,
    });
  }

  async findByDeal(tenantId: string, dealId: string) {
    return prisma.activity.findMany({
      where: { tenantId, dealId },
      orderBy: { activityAt: "desc" },
      include: ACTIVITY_BY_DEAL_INCLUDE,
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
