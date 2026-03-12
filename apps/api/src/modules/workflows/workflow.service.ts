import { createError } from "@/middlewares/errorHandler";
import workflowRepository from "./workflow.repository";
import type { CreateWorkflowDto, UpdateWorkflowDto } from "./workflow.schema";

export class WorkflowService {
  async getAll(tenantId: string) {
    return workflowRepository.findAllByTenant(tenantId);
  }

  async getByPipeline(tenantId: string, pipelineId: string) {
    return workflowRepository.findByPipeline(tenantId, pipelineId);
  }

  async getById(tenantId: string, id: string) {
    const workflow = await workflowRepository.findById(tenantId, id);
    if (!workflow) throw createError("Workflow not found", 404);
    return workflow;
  }

  async create(tenantId: string, data: CreateWorkflowDto) {
    return workflowRepository.create(tenantId, data);
  }

  async update(tenantId: string, id: string, data: UpdateWorkflowDto) {
    const existing = await workflowRepository.findById(tenantId, id);
    if (!existing) throw createError("Workflow not found", 404);

    if (data.name !== undefined || data.isActive !== undefined) {
      await workflowRepository.update(id, tenantId, {
        name: data.name,
        isActive: data.isActive,
      });
    }
    if (data.rules !== undefined) {
      await workflowRepository.upsertRules(id, data.rules);
    }
    const result = await workflowRepository.findById(tenantId, id);
    if (!result) throw createError("Workflow not found", 404);
    return result;
  }

  async delete(tenantId: string, id: string) {
    const existing = await workflowRepository.findById(tenantId, id);
    if (!existing) throw createError("Workflow not found", 404);
    await workflowRepository.delete(id);
  }
}

export default new WorkflowService();
