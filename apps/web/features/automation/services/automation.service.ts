import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import { unwrapApiData } from "@/lib/apiResponse";
import type { PaginationMeta } from "@/lib/apiTypes";
import type {
  AutomationActionConfigValue,
  AutomationActionTypeValue,
  AutomationCondition,
  AutomationExecutionModeValue,
  AutomationScopeValue,
  AutomationStatusValue,
  AutomationTriggerEventValue,
} from "@repo/shared";

export interface AutomationTrigger {
  id: string;
  eventName: AutomationTriggerEventValue;
  conditionGroups?: AutomationCondition[] | null;
  delayMinutes: number;
}

export interface AutomationStep {
  id: string;
  stepOrder: number;
  actionType: AutomationActionTypeValue;
  actionConfig: AutomationActionConfigValue;
  continueOnError: boolean;
}

export interface AutomationDefinition {
  id: string;
  name: string;
  description?: string | null;
  scopeType: AutomationScopeValue;
  scopeId?: string | null;
  status: AutomationStatusValue;
  executionMode: AutomationExecutionModeValue;
  suppressLegacyWorkflows: boolean;
  version: number;
  triggers: AutomationTrigger[];
  steps: AutomationStep[];
  /** Phase 3 DAG body when persisted without linear `steps` (BR-19). */
  flowGraph?: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRunStep {
  id: string;
  status: "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
  output?: Record<string, unknown> | null;
  errorMessage?: string | null;
  startedAt: string;
  completedAt?: string | null;
  automationStepId?: string | null;
  graphNodeId?: string | null;
}

export interface AutomationRun {
  id: string;
  automationEventId?: string | null;
  status: "RUNNING" | "SUCCEEDED" | "FAILED" | "SKIPPED";
  executionMode: AutomationExecutionModeValue;
  eventName: string;
  entityType: string;
  entityId: string;
  errorMessage?: string | null;
  stepOutput?: Record<string, unknown> | null;
  startedAt: string;
  completedAt?: string | null;
  runSteps: AutomationRunStep[];
}

export interface ReplayAutomationEventInput {
  reprocessFromStart?: boolean;
}

export interface CreateAutomationDefinitionInput {
  name: string;
  description?: string | null;
  scopeType: AutomationScopeValue;
  scopeId?: string | null;
  status?: AutomationStatusValue;
  executionMode?: AutomationExecutionModeValue;
  suppressLegacyWorkflows?: boolean;
  triggers: Array<{
    eventName: AutomationTriggerEventValue;
    conditions?: AutomationCondition[];
    delayMinutes?: number;
  }>;
  steps?: Array<{
    actionType: AutomationActionTypeValue;
    actionConfig: AutomationActionConfigValue;
    continueOnError?: boolean;
  }>;
  /** Phase 3 graph body; when set, `steps` must be empty on the API. */
  flowGraph?: unknown | null;
}

export type UpdateAutomationDefinitionInput =
  Partial<CreateAutomationDefinitionInput>;

export interface GetAutomationDefinitionsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AutomationStatusValue;
  scopeType?: AutomationScopeValue;
}

export interface AutomationDefinitionsListResponse {
  automations: AutomationDefinition[];
  pagination: PaginationMeta;
}

export async function getAutomationDefinitions(
  params?: GetAutomationDefinitionsParams,
): Promise<AutomationDefinitionsListResponse> {
  try {
    const res = await api.get("/automation/definitions", { params });
    return unwrapApiData<AutomationDefinitionsListResponse>(res.data);
  } catch (error) {
    handleApiError(error, "fetch automation definitions");
  }
}

export async function createAutomationDefinition(
  payload: CreateAutomationDefinitionInput,
): Promise<{ automation: AutomationDefinition }> {
  try {
    const res = await api.post("/automation/definitions", payload);
    return unwrapApiData<{ automation: AutomationDefinition }>(res.data);
  } catch (error) {
    handleApiError(error, "create automation definition");
  }
}

export async function updateAutomationDefinition(
  id: string,
  payload: UpdateAutomationDefinitionInput,
): Promise<{ automation: AutomationDefinition }> {
  try {
    const res = await api.put(`/automation/definitions/${id}`, payload);
    return unwrapApiData<{ automation: AutomationDefinition }>(res.data);
  } catch (error) {
    handleApiError(error, `update automation definition "${id}"`);
  }
}

export async function archiveAutomationDefinition(
  id: string,
): Promise<{ archived: true }> {
  try {
    const res = await api.delete(`/automation/definitions/${id}`);
    return unwrapApiData<{ archived: true }>(res.data);
  } catch (error) {
    handleApiError(error, `archive automation definition "${id}"`);
  }
}

export async function getAutomationRuns(
  id: string,
  params?: { limit?: number },
): Promise<{ runs: AutomationRun[] }> {
  try {
    const res = await api.get(`/automation/definitions/${id}/runs`, { params });
    return unwrapApiData<{ runs: AutomationRun[] }>(res.data);
  } catch (error) {
    handleApiError(error, `fetch automation runs for "${id}"`);
  }
}

export async function replayAutomationEvent(
  id: string,
  payload: ReplayAutomationEventInput = {},
): Promise<{
  replayQueued: true;
  resumedRuns?: number;
  mode?: "full" | "resume";
}> {
  try {
    const res = await api.post(`/automation/events/${id}/replay`, payload);
    return unwrapApiData<{
      replayQueued: true;
      resumedRuns?: number;
      mode?: "full" | "resume";
    }>(res.data);
  } catch (error) {
    handleApiError(error, `replay automation event "${id}"`);
  }
}
