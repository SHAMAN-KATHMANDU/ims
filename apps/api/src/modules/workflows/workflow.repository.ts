import prisma, { basePrisma } from "@/config/prisma";
import type {
  CreateWorkflowDto,
  CreateWorkflowRuleDto,
} from "./workflow.schema";

/** Transaction client typed for workflow models (basePrisma.$transaction tx omits them in this setup). */
type WorkflowTx = {
  pipelineWorkflow: {
    create: (args: unknown) => Promise<{ id: string }>;
    findFirst: (args: unknown) => Promise<unknown>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
  };
  workflowRule: {
    deleteMany: (args: unknown) => Promise<unknown>;
    createMany: (args: unknown) => Promise<unknown>;
  };
};

/** Extended prisma client type omits workflow delegates; use this for non-transaction workflow access. */
type WorkflowDb = {
  pipelineWorkflow: {
    findMany: (args: unknown) => Promise<unknown>;
    findFirst: (args: unknown) => Promise<unknown>;
    updateMany: (args: unknown) => Promise<{ count: number }>;
    deleteMany: (args: unknown) => Promise<unknown>;
  };
  workflowRule: {
    findMany: (args: unknown) => Promise<unknown>;
  };
};

const workflowDb = prisma as unknown as WorkflowDb;

export class WorkflowRepository {
  async findAllByTenant(tenantId: string) {
    return workflowDb.pipelineWorkflow.findMany({
      where: { tenantId },
      include: {
        pipeline: { select: { id: true, name: true } },
        rules: { orderBy: { ruleOrder: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async findByPipeline(tenantId: string, pipelineId: string) {
    return workflowDb.pipelineWorkflow.findMany({
      where: { tenantId, pipelineId },
      include: { rules: { orderBy: { ruleOrder: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async findActiveRulesByPipeline(tenantId: string, pipelineId: string) {
    return workflowDb.workflowRule.findMany({
      where: {
        workflow: {
          tenantId,
          pipelineId,
          isActive: true,
        },
      },
      include: { workflow: true },
      orderBy: [{ workflowId: "asc" }, { ruleOrder: "asc" }],
    });
  }

  async findById(tenantId: string, id: string) {
    return workflowDb.pipelineWorkflow.findFirst({
      where: { id, tenantId },
      include: {
        pipeline: true,
        rules: { orderBy: { ruleOrder: "asc" } },
      },
    });
  }

  async create(tenantId: string, data: CreateWorkflowDto) {
    const { rules: rulesData, ...rest } = data;
    return basePrisma.$transaction(async (tx) => {
      const db = tx as unknown as WorkflowTx;
      const workflow = await db.pipelineWorkflow.create({
        data: {
          tenantId,
          pipelineId: rest.pipelineId,
          name: rest.name.trim(),
          isActive: rest.isActive ?? true,
        },
      });
      if (rulesData && rulesData.length > 0) {
        await db.workflowRule.createMany({
          data: rulesData.map((r, i) => ({
            workflowId: workflow.id,
            trigger: r.trigger,
            triggerStageId: r.triggerStageId ?? null,
            action: r.action,
            actionConfig: (r.actionConfig ?? {}) as object,
            ruleOrder: r.ruleOrder ?? i,
          })),
        });
      }
      const result = await db.pipelineWorkflow.findFirst({
        where: { id: workflow.id, tenantId },
        include: {
          pipeline: true,
          rules: { orderBy: { ruleOrder: "asc" } },
        },
      });
      if (!result) throw new Error("Workflow not found after create");
      return result as Awaited<ReturnType<WorkflowRepository["findById"]>>;
    });
  }

  async update(
    id: string,
    tenantId: string,
    data: {
      name?: string;
      isActive?: boolean;
      rules?: CreateWorkflowRuleDto[];
    },
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    const hasRules = data.rules !== undefined;

    if (hasRules) {
      return basePrisma.$transaction(async (tx) => {
        const db = tx as unknown as WorkflowTx;
        if (Object.keys(updateData).length > 0) {
          const updated = await db.pipelineWorkflow.updateMany({
            where: { id, tenantId },
            data: updateData,
          });
          if (updated.count === 0) throw new Error("Workflow not found");
        }
        await db.workflowRule.deleteMany({ where: { workflowId: id } });
        if (data.rules!.length > 0) {
          await db.workflowRule.createMany({
            data: data.rules!.map((r, i) => ({
              workflowId: id,
              trigger: r.trigger,
              triggerStageId: r.triggerStageId ?? null,
              action: r.action,
              actionConfig: (r.actionConfig ?? {}) as object,
              ruleOrder: r.ruleOrder ?? i,
            })),
          });
        }
        const result = await db.pipelineWorkflow.findFirst({
          where: { id, tenantId },
          include: {
            pipeline: true,
            rules: { orderBy: { ruleOrder: "asc" } },
          },
        });
        if (!result) throw new Error("Workflow not found after update");
        return result as Awaited<ReturnType<WorkflowRepository["findById"]>>;
      });
    }

    const result = (await workflowDb.pipelineWorkflow.updateMany({
      where: { id, tenantId },
      data: updateData,
    })) as { count: number };
    if (result.count === 0) throw new Error("Workflow not found");
    const found = await this.findById(tenantId, id);
    if (!found) throw new Error("Workflow not found after update");
    return found;
  }

  async upsertRules(workflowId: string, rules: CreateWorkflowRuleDto[]) {
    await basePrisma.$transaction(async (tx) => {
      const db = tx as unknown as WorkflowTx;
      await db.workflowRule.deleteMany({ where: { workflowId } });
      if (rules.length === 0) return;
      await db.workflowRule.createMany({
        data: rules.map((r, i) => ({
          workflowId,
          trigger: r.trigger,
          triggerStageId: r.triggerStageId ?? null,
          action: r.action,
          actionConfig: (r.actionConfig ?? {}) as object,
          ruleOrder: r.ruleOrder ?? i,
        })),
      });
    });
  }

  async delete(id: string, tenantId: string) {
    const result = (await workflowDb.pipelineWorkflow.deleteMany({
      where: { id, tenantId },
    })) as { count: number };
    if (result.count === 0) throw new Error("Workflow not found");
  }
}

export default new WorkflowRepository();
