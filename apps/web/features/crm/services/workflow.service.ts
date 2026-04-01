import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { PaginationMeta } from "@/lib/apiTypes";

export type WorkflowTrigger =
  | "STAGE_ENTER"
  | "STAGE_EXIT"
  | "DEAL_CREATED"
  | "DEAL_WON"
  | "DEAL_LOST"
  | "PURCHASE_COUNT_CHANGED";
export type WorkflowAction =
  | "CREATE_TASK"
  | "SEND_NOTIFICATION"
  | "MOVE_STAGE"
  | "UPDATE_FIELD"
  | "CREATE_ACTIVITY"
  | "CREATE_DEAL"
  | "UPDATE_CONTACT_FIELD"
  | "APPLY_TAG"
  | "REMOVE_TAG";

export type WorkflowOrigin = "CUSTOM" | "TEMPLATE" | "SYSTEM";

export type WorkflowTemplateCategory =
  | "DEFAULT"
  | "DEAL_HYGIENE"
  | "RE_ENGAGEMENT"
  | "POST_SALE"
  | "DATA_QUALITY"
  | "INTERNAL_ALERTS";

export type WorkflowRunStatus = "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";

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
  description?: string | null;
  isActive: boolean;
  templateKey?: string | null;
  templateVersion?: number | null;
  origin: WorkflowOrigin;
  version?: number;
  publishedAt?: string | null;
  lastRunAt?: string | null;
  lastErrorAt?: string | null;
  runCount?: number;
  failureCount?: number;
  pipeline?: { id: string; name: string };
  rules: WorkflowRule[];
}

export interface WorkflowTemplate {
  templateKey: string;
  name: string;
  description: string;
  category: WorkflowTemplateCategory;
  difficulty: "BEGINNER" | "INTERMEDIATE";
  recommended: boolean;
  supportedObjects: Array<"DEAL" | "CONTACT" | "TASK" | "NOTIFICATION">;
  pipelineType: "NEW_SALES" | "REMARKETING" | "REPURCHASE";
  version: number;
  isInstalled: boolean;
  installedWorkflowId: string | null;
  installedWorkflowName: string | null;
  installedPipelineId: string | null;
  installedPipelineName: string | null;
  installedAt: string | null;
  isActive: boolean;
  availablePipelines: Array<{
    id: string;
    name: string;
    type: "NEW_SALES" | "REMARKETING" | "REPURCHASE";
  }>;
  rulesPreview: Array<{
    trigger: WorkflowTrigger;
    triggerStageId: string | null;
    action: WorkflowAction;
    ruleOrder: number | null;
  }>;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  ruleId: string | null;
  trigger: WorkflowTrigger;
  action: WorkflowAction | null;
  status: WorkflowRunStatus;
  entityType: string;
  entityId: string;
  dedupeKey?: string | null;
  attempt: number;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
  startedAt: string;
  completedAt?: string | null;
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
  description?: string | null;
  isActive?: boolean;
  rules?: CreateWorkflowRuleInput[];
}

export interface GetWorkflowsParams {
  pipelineId?: string;
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface WorkflowsResponse {
  workflows: Workflow[];
  pagination?: PaginationMeta;
}

export interface InstallWorkflowTemplateInput {
  pipelineId?: string;
  overwriteExisting?: boolean;
  activate?: boolean;
}

export async function getWorkflows(
  params?: GetWorkflowsParams,
): Promise<WorkflowsResponse> {
  try {
    const res = await api.get<WorkflowsResponse>("/workflows", { params });
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

export async function getWorkflowTemplates(): Promise<{
  templates: WorkflowTemplate[];
}> {
  try {
    const res = await api.get("/workflows/templates");
    return res.data;
  } catch (error) {
    handleApiError(error, "fetch workflow templates");
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

export async function installWorkflowTemplate(
  templateKey: string,
  data?: InstallWorkflowTemplateInput,
): Promise<{ workflow: Workflow }> {
  try {
    const res = await api.post(
      `/workflows/templates/${templateKey}/install`,
      data,
    );
    return res.data;
  } catch (error) {
    handleApiError(error, `install workflow template "${templateKey}"`);
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

export async function getWorkflowRuns(
  id: string,
  params?: { limit?: number },
): Promise<{ runs: WorkflowRun[] }> {
  try {
    const res = await api.get(`/workflows/${id}/runs`, { params });
    return res.data;
  } catch (error) {
    handleApiError(error, `fetch workflow runs for "${id}"`);
  }
}
