import prisma from "@/config/prisma";
import type {
  CreateWorkflowDto,
  CreateWorkflowRuleDto,
} from "./workflow.schema";

export class WorkflowRepository {
  async findAllByTenant(tenantId: string) {
    return prisma.pipelineWorkflow.findMany({
      where: { tenantId },
      include: {
        pipeline: { select: { id: true, name: true } },
        rules: { orderBy: { ruleOrder: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async findByPipeline(tenantId: string, pipelineId: string) {
    return prisma.pipelineWorkflow.findMany({
      where: { tenantId, pipelineId },
      include: { rules: { orderBy: { ruleOrder: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async findActiveRulesByPipeline(tenantId: string, pipelineId: string) {
    return prisma.workflowRule.findMany({
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
    return prisma.pipelineWorkflow.findFirst({
      where: { id, tenantId },
      include: {
        pipeline: true,
        rules: { orderBy: { ruleOrder: "asc" } },
      },
    });
  }

  async create(tenantId: string, data: CreateWorkflowDto) {
    const { rules: rulesData, ...rest } = data;
    const workflow = await prisma.pipelineWorkflow.create({
      data: {
        tenantId,
        pipelineId: rest.pipelineId,
        name: rest.name.trim(),
        isActive: rest.isActive ?? true,
      },
    });
    if (rulesData && rulesData.length > 0) {
      await this.upsertRules(workflow.id, rulesData);
    }
    const result = await this.findById(tenantId, workflow.id);
    if (!result) throw new Error("Workflow not found after create");
    return result;
  }

  async update(
    id: string,
    tenantId: string,
    data: { name?: string; isActive?: boolean },
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    await prisma.pipelineWorkflow.update({
      where: { id },
      data: updateData,
    });
    const result = await this.findById(tenantId, id);
    if (!result) throw new Error("Workflow not found after update");
    return result;
  }

  async upsertRules(workflowId: string, rules: CreateWorkflowRuleDto[]) {
    await prisma.workflowRule.deleteMany({ where: { workflowId } });
    if (rules.length === 0) return;

    await prisma.workflowRule.createMany({
      data: rules.map((r, i) => ({
        workflowId,
        trigger: r.trigger,
        triggerStageId: r.triggerStageId ?? null,
        action: r.action,
        actionConfig: (r.actionConfig ?? {}) as object,
        ruleOrder: r.ruleOrder ?? i,
      })),
    });
  }

  async delete(id: string) {
    await prisma.pipelineWorkflow.delete({ where: { id } });
  }
}

export default new WorkflowRepository();
