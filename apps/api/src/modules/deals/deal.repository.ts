import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import type { CreateDealDto, UpdateDealDto } from "./deal.schema";

const DEAL_INCLUDE = {
  contact: {
    select: { id: true, firstName: true, lastName: true, email: true },
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

    const where: Record<string, unknown> = { tenantId, deletedAt: null };
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
      where: { id, tenantId, deletedAt: null },
      include: DEAL_DETAIL_INCLUDE,
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
