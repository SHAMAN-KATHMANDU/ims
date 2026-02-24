/**
 * Deals service - business logic for deals module.
 */

import { DomainError, NotFoundError } from "@/shared/errors";
import type { AuthContext } from "@/shared/types";
import type { Prisma } from "@prisma/client";
import {
  normalizeDealStatus,
  applyStatusSideEffects,
  DealStatus,
} from "./handlers/statusHandlers";
import { dealsRepository } from "./deals.repository";

export async function createDeal(
  data: Record<string, unknown>,
  auth: AuthContext,
) {
  const { tenantId, userId } = auth;
  const pipelineId = data.pipelineId as string | undefined;

  const pipeline = await dealsRepository.findPipeline(pipelineId, tenantId);
  if (!pipeline) {
    throw new DomainError(
      400,
      "No pipeline found. Create a default pipeline first.",
    );
  }

  const stageNames = pipeline.pipelineStages.map((s) => s.name);
  const firstStage = stageNames.length > 0 ? stageNames[0] : "Qualification";

  const status = normalizeDealStatus(data.status);

  return dealsRepository.createDeal({
    tenantId,
    name: data.name as string,
    value: Number(data.value) || 0,
    stage: (data.stage as string) || firstStage,
    probability: Math.min(100, Math.max(0, Number(data.probability) || 0)),
    status,
    expectedCloseDate: data.expectedCloseDate
      ? new Date(data.expectedCloseDate as string)
      : null,
    contactId: (data.contactId as string) || null,
    memberId: (data.memberId as string) || null,
    companyId: (data.companyId as string) || null,
    pipelineId: pipeline.id,
    assignedToId: (data.assignedToId as string) || userId,
    createdById: userId,
  } as Prisma.DealUncheckedCreateInput);
}

export async function getAllDeals(params: {
  tenantId: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  search?: string;
  pipelineId?: string;
  stage?: string;
  status?: "OPEN" | "WON" | "LOST";
  assignedToId?: string;
}) {
  const where: Prisma.DealWhereInput = { tenantId: params.tenantId };

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      {
        contact: {
          OR: [
            { firstName: { contains: params.search, mode: "insensitive" } },
            { lastName: { contains: params.search, mode: "insensitive" } },
          ],
        },
      },
      {
        member: {
          OR: [
            { name: { contains: params.search, mode: "insensitive" } },
            { phone: { contains: params.search, mode: "insensitive" } },
            { email: { contains: params.search, mode: "insensitive" } },
          ],
        },
      },
      { company: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }
  if (params.pipelineId) where.pipelineId = params.pipelineId;
  if (params.stage) where.stage = params.stage;
  if (params.status) where.status = params.status;
  if (params.assignedToId) where.assignedToId = params.assignedToId;

  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "name",
    "value",
    "expectedCloseDate",
    "id",
  ];
  const orderByField = allowedSortFields.includes(params.sortBy)
    ? params.sortBy
    : "createdAt";
  const orderBy = {
    [orderByField]: params.sortOrder,
  } as Prisma.DealOrderByWithRelationInput;

  const skip = (params.page - 1) * params.limit;

  const [totalItems, deals] = await Promise.all([
    dealsRepository.countDeals(where),
    dealsRepository.findDeals({ where, orderBy, skip, take: params.limit }),
  ]);

  return { deals, totalItems };
}

export async function getDealsByPipeline(
  pipelineId: string | undefined,
  auth: AuthContext,
) {
  const pipeline = await dealsRepository.findPipeline(
    pipelineId,
    auth.tenantId,
  );
  if (!pipeline) throw new NotFoundError("No pipeline found");

  const stageNames = pipeline.pipelineStages.map((s) => s.name);

  const deals = await dealsRepository.findDeals({
    where: {
      tenantId: auth.tenantId,
      pipelineId: pipeline.id,
      status: DealStatus.OPEN,
    },
    orderBy: { createdAt: "desc" },
    skip: 0,
    take: 1000,
  });

  const byStage = stageNames.map((stageName) => ({
    stage: stageName,
    deals: deals.filter((d) => d.stage === stageName),
  }));

  return { pipeline, stages: byStage, deals };
}

export async function getDealById(id: string, auth: AuthContext) {
  const deal = await dealsRepository.findDealById(id, auth.tenantId);
  if (!deal) throw new NotFoundError("Deal not found");
  return deal;
}

export async function updateDeal(
  id: string,
  data: Record<string, unknown>,
  auth: AuthContext,
) {
  const existing = await dealsRepository.findDealById(id, auth.tenantId);
  if (!existing) throw new NotFoundError("Deal not found");

  const updateData: Prisma.DealUpdateInput = {};
  if (data.name !== undefined)
    updateData.name = (data.name as string) || existing.name;
  if (data.value !== undefined)
    updateData.value = Number(data.value) ?? existing.value;
  if (data.stage !== undefined) updateData.stage = data.stage as string;
  if (data.probability !== undefined) {
    updateData.probability = Math.min(
      100,
      Math.max(0, Number(data.probability) ?? 0),
    );
  }
  if (data.status !== undefined) {
    const status = normalizeDealStatus(data.status);
    updateData.status = status;
    applyStatusSideEffects(status, updateData as { closedAt?: Date | null });
  }
  if (data.expectedCloseDate !== undefined) {
    updateData.expectedCloseDate = data.expectedCloseDate
      ? new Date(data.expectedCloseDate as string)
      : null;
  }
  if (data.closedAt !== undefined) {
    updateData.closedAt = data.closedAt
      ? new Date(data.closedAt as string)
      : null;
  }
  if (data.lostReason !== undefined)
    updateData.lostReason = (data.lostReason as string) || null;
  if (data.contactId !== undefined) {
    updateData.contact = (data.contactId as string)
      ? { connect: { id: data.contactId as string } }
      : { disconnect: true };
  }
  if (data.memberId !== undefined) {
    updateData.member = (data.memberId as string)
      ? { connect: { id: data.memberId as string } }
      : { disconnect: true };
  }
  if (data.companyId !== undefined) {
    updateData.company = (data.companyId as string)
      ? { connect: { id: data.companyId as string } }
      : { disconnect: true };
  }
  if (data.assignedToId !== undefined) {
    updateData.assignedTo = { connect: { id: data.assignedToId as string } };
  }

  const deal = await dealsRepository.updateDeal(id, updateData);

  if (data.stage && data.stage !== existing.stage && existing.assignedToId) {
    await dealsRepository.createNotification({
      userId: existing.assignedToId,
      type: "DEAL_STAGE_CHANGE",
      title: "Deal stage updated",
      message: `Deal "${deal.name}" moved to ${data.stage}`,
      resourceType: "deal",
      resourceId: deal.id,
    });
  }

  return deal;
}

export async function updateDealStage(
  id: string,
  stage: string,
  auth: AuthContext,
) {
  const existing = await dealsRepository.findDealById(id, auth.tenantId);
  if (!existing) throw new NotFoundError("Deal not found");

  const deal = await dealsRepository.updateDeal(id, { stage });

  if (existing.assignedToId) {
    await dealsRepository.createNotification({
      userId: existing.assignedToId,
      type: "DEAL_STAGE_CHANGE",
      title: "Deal stage updated",
      message: `Deal "${deal.name}" moved to ${stage}`,
      resourceType: "deal",
      resourceId: deal.id,
    });
  }

  return deal;
}

export async function deleteDeal(id: string, auth: AuthContext) {
  const existing = await dealsRepository.findDealById(id, auth.tenantId);
  if (!existing) throw new NotFoundError("Deal not found");

  await dealsRepository.updateDeal(id, { deletedAt: new Date() });
}
