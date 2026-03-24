import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import type { CreateDealDto, UpdateDealDto } from "./deal.schema";

const DEAL_INCLUDE = {
  contact: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      purchaseCount: true,
    },
  },
  member: { select: { id: true, name: true, phone: true, email: true } },
  company: { select: { id: true, name: true } },
  pipeline: true,
  assignedTo: { select: { id: true, username: true } },
} as const;

const DEAL_DETAIL_INCLUDE = {
  contact: true,
  member: true,
  company: true,
  pipeline: true,
  assignedTo: { select: { id: true, username: true } },
  editedBy: { select: { id: true, username: true } },
  lead: true,
  lineItems: {
    include: {
      product: { select: { id: true, name: true, imsCode: true } },
      variation: { select: { id: true } },
    },
  },
  tasks: {
    where: { deletedAt: null },
    include: { assignedTo: { select: { id: true, username: true } } },
  },
  activities: {
    where: { deletedAt: null },
    include: { creator: { select: { id: true, username: true } } },
  },
} as const;

export class DealRepository {
  async findAll(tenantId: string, query: Record<string, unknown>) {
    const { page, limit, sortBy, sortOrder, search } =
      getPaginationParams(query);
    const pipelineId = query.pipelineId as string | undefined;
    const stage = query.stage as string | undefined;
    const status = query.status as string | undefined;
    const assignedToId = query.assignedToId as string | undefined;
    const contactId = query.contactId as string | undefined;

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "name",
      "value",
      "expectedCloseDate",
      "id",
    ];
    const orderBy = getPrismaOrderBy(sortBy, sortOrder, allowedSortFields) || {
      createdAt: "desc",
    };

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
      isLatest: true,
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        {
          contact: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          member: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        { company: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (pipelineId) where.pipelineId = pipelineId;
    if (stage) where.stage = stage;
    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;
    if (contactId) where.contactId = contactId;

    const skip = (page - 1) * limit;

    const [totalItems, deals] = await Promise.all([
      prisma.deal.count({ where }),
      prisma.deal.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: DEAL_INCLUDE,
      }),
    ]);

    return createPaginationResult(deals, totalItems, page, limit);
  }

  async findKanban(tenantId: string, pipelineId?: string) {
    let pipeline = pipelineId
      ? await prisma.pipeline.findFirst({ where: { id: pipelineId, tenantId } })
      : await prisma.pipeline.findFirst({
          where: { tenantId, isDefault: true },
        });

    if (!pipeline) {
      pipeline = await prisma.pipeline.findFirst({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: "asc" },
      });
    }

    if (!pipeline) return null;

    const stages =
      (pipeline.stages as Array<{ id: string; name: string }>) || [];
    const stageNames = stages.map((s) => s.name);

    const deals = await prisma.deal.findMany({
      where: {
        tenantId,
        pipelineId: pipeline.id,
        status: "OPEN",
        deletedAt: null,
        isLatest: true,
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const byStage = stageNames.map((stageName) => ({
      stage: stageName,
      deals: deals.filter((d) => d.stage === stageName),
    }));

    return { pipeline, stages: byStage, deals };
  }

  async findById(tenantId: string, id: string) {
    return prisma.deal.findFirst({
      where: { id, tenantId, deletedAt: null, isLatest: true },
      include: DEAL_DETAIL_INCLUDE,
    });
  }

  async getPipelineClosingStageNames(pipelineId: string, tenantId: string) {
    return prisma.pipeline.findFirst({
      where: { id: pipelineId, tenantId, deletedAt: null },
      select: { closedWonStageName: true, closedLostStageName: true },
    });
  }

  /** Latest open deal for a contact in a pipeline (optional stage filter). */
  async findLatestOpenDealForContactInPipeline(
    tenantId: string,
    contactId: string,
    pipelineId: string,
    stageName?: string | null,
  ) {
    return prisma.deal.findFirst({
      where: {
        tenantId,
        contactId,
        pipelineId,
        status: "OPEN",
        deletedAt: null,
        isLatest: true,
        ...(stageName ? { stage: stageName } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
  }

  async findDefaultPipeline(tenantId: string, pipelineId?: string | null) {
    if (pipelineId) {
      const byId = await prisma.pipeline.findFirst({
        where: { id: pipelineId, tenantId, deletedAt: null },
      });
      if (byId) return byId;
    }
    const defaultPipe = await prisma.pipeline.findFirst({
      where: { tenantId, isDefault: true, deletedAt: null },
    });
    if (defaultPipe) return defaultPipe;
    return prisma.pipeline.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(
    tenantId: string,
    data: CreateDealDto,
    userId: string,
    stage: string,
    pipelineId: string,
  ) {
    return prisma.deal.create({
      data: {
        tenantId,
        name: data.name.trim(),
        value: Number(data.value) || 0,
        stage,
        probability: Math.min(100, Math.max(0, Number(data.probability) || 0)),
        status: "OPEN",
        expectedCloseDate: data.expectedCloseDate
          ? new Date(data.expectedCloseDate)
          : null,
        contactId: data.contactId || null,
        memberId: data.memberId || null,
        companyId: data.companyId || null,
        pipelineId,
        assignedToId: data.assignedToId || userId,
        createdById: userId,
      },
      include: DEAL_INCLUDE,
    });
  }

  async update(id: string, data: UpdateDealDto, existingName: string) {
    const updateData: Record<string, unknown> = {
      ...(data.name !== undefined && {
        name: data.name?.trim() || existingName,
      }),
      ...(data.value !== undefined && { value: Number(data.value) }),
      ...(data.stage !== undefined && { stage: data.stage }),
      ...(data.probability !== undefined && {
        probability: Math.min(100, Math.max(0, Number(data.probability))),
      }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.expectedCloseDate !== undefined && {
        expectedCloseDate: data.expectedCloseDate
          ? new Date(data.expectedCloseDate)
          : null,
      }),
      ...(data.closedAt !== undefined && {
        closedAt: data.closedAt ? new Date(data.closedAt) : null,
      }),
      ...(data.lostReason !== undefined && {
        lostReason: data.lostReason?.trim() || null,
      }),
      ...(data.contactId !== undefined && {
        contactId: data.contactId || null,
      }),
      ...(data.memberId !== undefined && { memberId: data.memberId || null }),
      ...(data.companyId !== undefined && {
        companyId: data.companyId || null,
      }),
      ...(data.assignedToId !== undefined && {
        assignedToId: data.assignedToId,
      }),
    };

    if (data.status === "WON" || data.status === "LOST") {
      updateData.closedAt = new Date();
    }

    return prisma.deal.update({
      where: { id },
      data: updateData,
      include: DEAL_INCLUDE,
    });
  }

  async updateStage(id: string, stage: string, tenantId: string) {
    return prisma.deal.update({
      where: { id, tenantId },
      data: { stage },
      include: DEAL_INCLUDE,
    });
  }

  async softDelete(
    id: string,
    data: { deletedBy: string; deleteReason?: string | null },
  ) {
    return prisma.deal.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: data.deletedBy,
        deleteReason: data.deleteReason ?? undefined,
      },
    });
  }

  async createDealRevision(
    parentDealId: string,
    tenantId: string,
    updates: UpdateDealDto,
    editedById: string,
    editReason: string | null,
  ) {
    return prisma.$transaction(async (tx) => {
      const parent = await tx.deal.findFirst({
        where: {
          id: parentDealId,
          tenantId,
          deletedAt: null,
          isLatest: true,
        },
        include: { lineItems: true },
      });
      if (!parent) return null;

      const name =
        updates.name !== undefined
          ? (updates.name?.trim() ?? parent.name)
          : parent.name;
      const value =
        updates.value !== undefined
          ? Number(updates.value)
          : Number(parent.value);
      const stage = updates.stage ?? parent.stage;
      const probability =
        updates.probability !== undefined
          ? Math.min(100, Math.max(0, Number(updates.probability)))
          : parent.probability;
      const status = updates.status ?? parent.status;
      const expectedCloseDate =
        updates.expectedCloseDate !== undefined
          ? updates.expectedCloseDate
            ? new Date(updates.expectedCloseDate)
            : null
          : parent.expectedCloseDate;
      const closedAt =
        status === "WON" || status === "LOST"
          ? new Date()
          : updates.closedAt
            ? new Date(updates.closedAt)
            : parent.closedAt;
      const lostReason =
        updates.lostReason !== undefined
          ? (updates.lostReason?.trim() ?? null)
          : parent.lostReason;
      const contactId =
        updates.contactId !== undefined
          ? (updates.contactId ?? null)
          : parent.contactId;
      const memberId =
        updates.memberId !== undefined
          ? (updates.memberId ?? null)
          : parent.memberId;
      const companyId =
        updates.companyId !== undefined
          ? (updates.companyId ?? null)
          : parent.companyId;
      const assignedToId = updates.assignedToId ?? parent.assignedToId;
      const pipelineId =
        updates.pipelineId !== undefined && updates.pipelineId !== null
          ? updates.pipelineId
          : parent.pipelineId;

      await tx.deal.update({
        where: { id: parentDealId },
        data: { isLatest: false },
      });

      const newDeal = await tx.deal.create({
        data: {
          tenantId,
          name,
          value,
          stage,
          probability,
          status,
          expectedCloseDate,
          closedAt,
          lostReason,
          contactId,
          memberId,
          companyId,
          pipelineId,
          assignedToId,
          createdById: parent.createdById,
          leadId: parent.leadId,
          parentDealId: parent.id,
          revisionNo: parent.revisionNo + 1,
          isLatest: true,
          editedById,
          editedAt: new Date(),
          editReason: editReason ?? undefined,
          lineItems: {
            create: parent.lineItems.map((li) => ({
              productId: li.productId,
              variationId: li.variationId,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
            })),
          },
        },
        include: DEAL_DETAIL_INCLUDE,
      });
      return newDeal;
    });
  }

  async createDeleteRevision(
    dealId: string,
    tenantId: string,
    data: { deletedBy: string; deleteReason?: string | null },
  ) {
    return prisma.$transaction(async (tx) => {
      const parent = await tx.deal.findFirst({
        where: {
          id: dealId,
          tenantId,
          deletedAt: null,
          isLatest: true,
        },
        include: { lineItems: true },
      });
      if (!parent) return null;

      await tx.deal.update({
        where: { id: dealId },
        data: { isLatest: false },
      });

      const newDeal = await tx.deal.create({
        data: {
          tenantId: parent.tenantId,
          name: parent.name,
          value: parent.value,
          stage: parent.stage,
          probability: parent.probability,
          status: parent.status,
          expectedCloseDate: parent.expectedCloseDate,
          closedAt: parent.closedAt,
          lostReason: parent.lostReason,
          contactId: parent.contactId,
          memberId: parent.memberId,
          companyId: parent.companyId,
          pipelineId: parent.pipelineId,
          assignedToId: parent.assignedToId,
          createdById: parent.createdById,
          leadId: parent.leadId,
          parentDealId: parent.id,
          revisionNo: parent.revisionNo + 1,
          isLatest: true,
          deletedAt: new Date(),
          deletedBy: data.deletedBy,
          deleteReason: data.deleteReason ?? undefined,
          lineItems: {
            create: parent.lineItems.map((li) => ({
              productId: li.productId,
              variationId: li.variationId,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
            })),
          },
        },
        include: DEAL_INCLUDE,
      });
      return newDeal;
    });
  }

  async addLineItem(
    dealId: string,
    data: {
      productId: string;
      variationId: string | null;
      quantity: number;
      unitPrice: number;
    },
  ) {
    return prisma.dealLineItem.create({
      data: {
        dealId,
        productId: data.productId,
        variationId: data.variationId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
      },
      include: {
        product: { select: { id: true, name: true, imsCode: true } },
        variation: { select: { id: true } },
      },
    });
  }

  async removeLineItem(dealId: string, lineItemId: string) {
    return prisma.dealLineItem.deleteMany({
      where: { id: lineItemId, dealId },
    });
  }

  async findFirstVariationByProduct(productId: string, tenantId: string) {
    return prisma.productVariation.findFirst({
      where: { productId, tenantId, isActive: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async createNotification(
    userId: string,
    dealId: string,
    dealName: string,
    stage: string,
  ) {
    return prisma.notification.create({
      data: {
        userId,
        type: "DEAL_STAGE_CHANGE",
        title: "Deal stage updated",
        message: `Deal "${dealName}" moved to ${stage}`,
        resourceType: "deal",
        resourceId: dealId,
      },
    });
  }
}

export default new DealRepository();
