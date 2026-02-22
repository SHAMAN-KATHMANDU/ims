/**
 * Data migration: copy Pipeline.stages (JSON) into pipeline_stages table.
 * Run after applying the add_pipeline_stages migration.
 *
 * Usage: npx ts-node -r tsconfig-paths/register scripts/migrate-pipeline-stages.ts
 */

import { basePrisma } from "../src/config/prisma";

type StageJson = {
  id?: string;
  name: string;
  order?: number;
  probability?: number;
};

async function main() {
  const pipelines = await basePrisma.pipeline.findMany({
    where: { stages: { not: null } },
    select: { id: true, stages: true },
  });

  for (const p of pipelines) {
    const stages = p.stages as StageJson[] | null;
    if (!Array.isArray(stages) || stages.length === 0) continue;

    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      const name = typeof s?.name === "string" ? s.name : `Stage ${i + 1}`;
      const order = typeof s?.order === "number" ? s.order : i;
      const probability =
        typeof s?.probability === "number" ? s.probability : 0;

      await basePrisma.pipelineStage.upsert({
        where: {
          pipelineId_name: { pipelineId: p.id, name },
        },
        create: {
          pipelineId: p.id,
          name,
          order,
          probability,
        },
        update: { order, probability },
      });
    }
  }

  console.log(`Migrated stages for ${pipelines.length} pipelines.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => basePrisma.$disconnect());
