import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export type WorkflowTrigger =
  | "STAGE_ENTER"
  | "STAGE_EXIT"
  | "DEAL_CREATED"
  | "DEAL_WON"
  | "DEAL_LOST";
export type WorkflowAction =
  | "CREATE_TASK"
  | "SEND_NOTIFICATION"
  | "MOVE_STAGE"
  | "UPDATE_FIELD"
  | "CREATE_ACTIVITY";

export interface WorkflowRule {
  id: string;
  trigger: WorkflowTrigger;
  triggerStageId: string | null;
  action: WorkflowAction;
  actionConfig: Record<string, unknown>;
  ruleOrder: number;
}

export interface Workflow {
  id: string;
  tenantId: string;
  pipelineId: string;
  name: string;
  isActive: boolean;
  pipeline?: { id: string; name: string };
  rules: WorkflowRule[];
}

export interface CreateWorkflowInput {
  pipelineId: string;
  name: string;
  isActive?: boolean;
  rules?: CreateWorkflowRuleInput[];
}

export interface CreateWorkflowRuleInput {
  trigger: WorkflowTrigger;
  triggerStageId?: string | null;
  action: WorkflowAction;
  actionConfig: Record<string, unknown>;
  ruleOrder?: number;
}

export interface UpdateWorkflowInput {
  name?: string;
  isActive?: boolean;
  rules?: CreateWorkflowRuleInput[];
}

export async function getWorkflows(
  pipelineId?: string,
): Promise<{ workflows: Workflow[] }> {
  try {
    const params = pipelineId ? { pipelineId } : undefined;
    const res = await api.get("/workflows", { params });
    return res.data;
  } catch (error) {
    handleApiError(error, "fetch workflows");
  }
}

export async function getWorkflowById(
  id: string,
): Promise<{ workflow: Workflow }> {
  try {
    const res = await api.get(`/workflows/${id}`);
    return res.data;
  } catch (error) {
    handleApiError(error, `fetch workflow "${id}"`);
  }
}

export async function createWorkflow(
  data: CreateWorkflowInput,
): Promise<{ workflow: Workflow }> {
  try {
    const res = await api.post("/workflows", data);
    return res.data;
  } catch (error) {
    handleApiError(error, "create workflow");
  }
}

export async function updateWorkflow(
  id: string,
  data: UpdateWorkflowInput,
): Promise<{ workflow: Workflow }> {
  try {
    const res = await api.put(`/workflows/${id}`, data);
    return res.data;
  } catch (error) {
    handleApiError(error, `update workflow "${id}"`);
  }
}

export async function deleteWorkflow(id: string): Promise<void> {
  try {
    await api.delete(`/workflows/${id}`);
  } catch (error) {
    handleApiError(error, `delete workflow "${id}"`);
  }
}
