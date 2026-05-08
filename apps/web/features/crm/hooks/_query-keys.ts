/**
 * Shared query-key factories for the CRM feature.
 *
 * Lives in a leaf file (no other hook imports) so the per-entity hooks
 * (use-contacts, use-deals, use-tasks, use-workflows, use-crm) can pull
 * each other's keys for cross-entity cache invalidation without forming
 * an import cycle.
 */

import type {
  ContactListParams,
  GetContactTagsParams,
} from "../services/contact.service";
import type { DealListParams } from "../services/deal.service";
import type { TaskListParams } from "../services/task.service";
import type { GetWorkflowsParams } from "../services/workflow.service";

export const crmKeys = {
  /** Prefix for all CRM overview / reports queries — use for invalidation after mutations. */
  all: ["crm"] as const,
  dashboard: () => ["crm", "dashboard"] as const,
  reports: (year?: number) => ["crm", "reports", year] as const,
};

export const contactKeys = {
  all: ["contacts"] as const,
  lists: () => [...contactKeys.all, "list"] as const,
  list: (params: ContactListParams) =>
    [...contactKeys.lists(), params] as const,
  details: () => [...contactKeys.all, "detail"] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
  tags: (params?: GetContactTagsParams) =>
    [...contactKeys.all, "tags", params] as const,
  tagsAll: () => [...contactKeys.all, "tags"] as const,
};

export const dealKeys = {
  all: ["deals"] as const,
  lists: () => [...dealKeys.all, "list"] as const,
  list: (params: DealListParams) => [...dealKeys.lists(), params] as const,
  kanbans: () => [...dealKeys.all, "kanban"] as const,
  kanban: (pipelineId?: string) =>
    pipelineId
      ? ([...dealKeys.kanbans(), pipelineId] as const)
      : dealKeys.kanbans(),
  details: () => [...dealKeys.all, "detail"] as const,
  detail: (id: string) => [...dealKeys.details(), id] as const,
};

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (params: TaskListParams) => [...taskKeys.lists(), params] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

export const workflowKeys = {
  all: ["workflows"] as const,
  lists: (params?: GetWorkflowsParams) =>
    [...workflowKeys.all, "list", params] as const,
  templates: () => [...workflowKeys.all, "templates"] as const,
  detail: (id: string) => [...workflowKeys.all, "detail", id] as const,
  runs: (id: string, limit?: number) =>
    [...workflowKeys.detail(id), "runs", limit] as const,
};
