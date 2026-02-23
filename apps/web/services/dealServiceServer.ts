/**
 * Server-safe Deal Service.
 * Use in Server Components and Route Handlers. Do NOT use in client components.
 */

import { fetchServer } from "@/lib/api-server";
import type {
  PaginatedDealsResponse,
  DealListParams,
  Deal,
} from "@/services/dealService";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export { type PaginatedDealsResponse, type DealListParams };

function buildDealQueryParams(params: DealListParams): URLSearchParams {
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(params.page ?? DEFAULT_PAGE));
  queryParams.set("limit", String(params.limit ?? DEFAULT_LIMIT));
  if (params.search?.trim()) queryParams.set("search", params.search.trim());
  if (params.sortBy) queryParams.set("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.set("sortOrder", params.sortOrder);
  if (params.pipelineId) queryParams.set("pipelineId", params.pipelineId);
  if (params.stage) queryParams.set("stage", params.stage);
  if (params.status) queryParams.set("status", params.status);
  if (params.assignedToId) queryParams.set("assignedToId", params.assignedToId);
  return queryParams;
}

/**
 * Fetch deals with pagination. Use in Server Components.
 */
export async function getDealsServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  params: DealListParams = {},
): Promise<PaginatedDealsResponse> {
  const queryParams = buildDealQueryParams(params);
  const response = await fetchServer(`/deals?${queryParams.toString()}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch deals (${response.status})`;
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
 * Fetch a single deal by ID. Use in Server Components.
 */
export async function getDealServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  id: string,
): Promise<{ deal: Deal }> {
  if (!id?.trim()) {
    throw new Error("Deal ID is required");
  }

  const response = await fetchServer(`/deals/${id}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch deal (${response.status})`;
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

export interface DealsKanbanServerResponse {
  pipeline: unknown;
  stages: Array<{ stage: string; deals: Deal[] }>;
  deals: Deal[];
}

/**
 * Fetch deals in kanban format (by pipeline/stages). Use in Server Components.
 */
export async function getDealsKanbanServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  pipelineId?: string,
): Promise<DealsKanbanServerResponse> {
  const query = pipelineId
    ? `?pipelineId=${encodeURIComponent(pipelineId)}`
    : "";
  const response = await fetchServer(`/deals/kanban${query}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { pipeline: null, stages: [], deals: [] };
    }
    const text = await response.text();
    let message = `Failed to fetch deals kanban (${response.status})`;
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
