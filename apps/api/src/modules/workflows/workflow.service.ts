import { createError } from "@/middlewares/errorHandler";
import { createPaginationResult } from "@/utils/pagination";
import workflowRepository from "./workflow.repository";
import {
  parseActionConfig,
  type CreateWorkflowDto,
  type CreateWorkflowRuleDto,
  type GetWorkflowsQueryDto,
  type UpdateWorkflowDto,
} from "./workflow.schema";

function validateRulesActionConfig(
  rules: CreateWorkflowRuleDto[] | undefined,
): void {
  if (!rules || rules.length === 0) return;
  for (let i = 0; i < rules.length; i++) {
    try {
      parseActionConfig(rules[i].action, rules[i].actionConfig ?? {});
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Invalid rule action config";
      throw createError(`Rule ${i + 1}: ${message}`, 400);
    }
  }
}

export class WorkflowService {
  async getAll(tenantId: string, query?: GetWorkflowsQueryDto) {
    const page = query?.page;
    const limit = query?.limit;
    const usePagination =
      page !== undefined && limit !== undefined && page >= 1 && limit >= 1;
    const filters = {
      search: query?.search,
      isActive: query?.isActive,
      pipelineId: query?.pipelineId,
    };
    if (usePagination) {
      const [totalItems, workflows] = await Promise.all([
        workflowRepository.countByTenant(tenantId, filters),
        workflowRepository.findAllByTenantPaginated(
          tenantId,
          (page - 1) * limit,
          limit,
          filters,
        ),
      ]);
      const result = createPaginationResult(workflows, totalItems, page, limit);
      return { workflows: result.data, pagination: result.pagination };
    }
    const workflows = await workflowRepository.findAllByTenant(tenantId);
    return { workflows };
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
    validateRulesActionConfig(data.rules);
    return workflowRepository.create(tenantId, data);
  }

  async update(tenantId: string, id: string, data: UpdateWorkflowDto) {
    const existing = await workflowRepository.findById(tenantId, id);
    if (!existing) throw createError("Workflow not found", 404);

    validateRulesActionConfig(data.rules);
    return workflowRepository.update(id, tenantId, {
      name: data.name,
      isActive: data.isActive,
      rules: data.rules,
    });
  }

  async delete(tenantId: string, id: string) {
    const existing = await workflowRepository.findById(tenantId, id);
    if (!existing) throw createError("Workflow not found", 404);
    await workflowRepository.delete(id, tenantId);
  }
}

export default new WorkflowService();
