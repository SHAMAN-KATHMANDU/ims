/**
 * Server-safe Task Service.
 * Use in Server Components and Route Handlers. Do NOT use in client components.
 */

import { fetchServer } from "@/lib/api-server";
import {
  type PaginatedTasksResponse,
  type TaskListParams,
  type Task,
} from "@/services/taskService";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export { type PaginatedTasksResponse, type TaskListParams };

function buildTaskQueryParams(params: TaskListParams): URLSearchParams {
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(params.page ?? DEFAULT_PAGE));
  queryParams.set("limit", String(params.limit ?? DEFAULT_LIMIT));
  if (params.search?.trim()) queryParams.set("search", params.search.trim());
  if (params.sortBy) queryParams.set("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.set("sortOrder", params.sortOrder);
  if (typeof params.completed === "boolean")
    queryParams.set("completed", String(params.completed));
  if (params.assignedToId) queryParams.set("assignedToId", params.assignedToId);
  if (params.dueToday) queryParams.set("dueToday", String(params.dueToday));
  return queryParams;
}

/**
 * Fetch tasks with pagination. Use in Server Components.
 */
export async function getTasksServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  params: TaskListParams = {},
): Promise<PaginatedTasksResponse> {
  const queryParams = buildTaskQueryParams(params);
  const response = await fetchServer(`/tasks?${queryParams.toString()}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch tasks (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (typeof json?.message === "string") message = json.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const json = await response.json();
  return {
    data: json.data ?? [],
    pagination: json.pagination ?? {},
  };
}

/**
 * Fetch a single task by ID. Use in Server Components.
 */
export async function getTaskServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  id: string,
): Promise<{ task: Task }> {
  if (!id?.trim()) {
    throw new Error("Task ID is required");
  }

  const response = await fetchServer(`/tasks/${id}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch task (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (typeof json?.message === "string") message = json.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return response.json();
}
