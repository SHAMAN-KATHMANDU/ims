import type { PrismaClient } from "@prisma/client";
import { CRM_PIPELINE_TEMPLATES } from "@repo/shared";
import { deterministicId } from "./utils";
import type { SeedContext } from "./types";

export async function seedPipelines(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const tmpl =
    CRM_PIPELINE_TEMPLATES.find((t) => t.suggestAsDefault) ??
    CRM_PIPELINE_TEMPLATES[0];
  const stages = tmpl.stageNames.map((name, i) => ({
    id: deterministicId(
      "pipeline-stage",
      `${ctx.tenantId}:${tmpl.templateId}:${i}`,
    ),
    name,
    order: i + 1,
    probability: tmpl.probabilities[i] ?? 0,
  }));

  const pipelineId = deterministicId("pipeline", `${ctx.tenantId}:default`);
  const pipeline = await prisma.pipeline.upsert({
    where: { id: pipelineId },
    create: {
      id: pipelineId,
      tenantId: ctx.tenantId,
      name: tmpl.name,
      type: tmpl.type,
      isDefault: true,
      stages,
      closedWonStageName: tmpl.closedWonStageName ?? undefined,
      closedLostStageName: tmpl.closedLostStageName ?? undefined,
    },
    update: {
      name: tmpl.name,
      type: tmpl.type,
      stages,
      isDefault: true,
      closedWonStageName: tmpl.closedWonStageName ?? undefined,
      closedLostStageName: tmpl.closedLostStageName ?? undefined,
    },
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
