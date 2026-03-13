import type { PrismaClient } from "@prisma/client";
import { deterministicId } from "./utils";
import type { SeedContext } from "./types";

const DEFAULT_STAGES = [
  { id: "1", name: "Qualification", order: 1, probability: 10 },
  { id: "2", name: "Proposal", order: 2, probability: 30 },
  { id: "3", name: "Negotiation", order: 3, probability: 60 },
  { id: "4", name: "Closed Won", order: 4, probability: 100 },
  { id: "5", name: "Closed Lost", order: 5, probability: 0 },
];

export async function seedPipelines(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const pipelineId = deterministicId("pipeline", `${ctx.tenantId}:default`);
  const pipeline = await prisma.pipeline.upsert({
    where: { id: pipelineId },
    create: {
      id: pipelineId,
      tenantId: ctx.tenantId,
      name: "Sales Pipeline",
      isDefault: true,
      stages: DEFAULT_STAGES,
    },
    update: { name: "Sales Pipeline", stages: DEFAULT_STAGES, isDefault: true },
  });

  await prisma.pipelineWorkflow.upsert({
    where: {
      tenantId_pipelineId_name: {
        tenantId: ctx.tenantId,
        pipelineId: pipeline.id,
        name: "On Stage Enter",
      },
    },
    create: {
      tenantId: ctx.tenantId,
      pipelineId: pipeline.id,
      name: "On Stage Enter",
      isActive: true,
    },
    update: { isActive: true },
  });

  return { ...ctx, pipelineId: pipeline.id };
}
