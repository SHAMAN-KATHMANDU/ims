/**
 * Server-safe Lead Service.
 * Use in Server Components and Route Handlers. Do NOT use in client components.
 */

import { fetchServer } from "@/lib/api-server";
import {
  type PaginatedLeadsResponse,
  type LeadListParams,
  type Lead,
} from "@/services/leadService";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export { type PaginatedLeadsResponse, type LeadListParams };

function buildLeadQueryParams(params: LeadListParams): URLSearchParams {
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(params.page ?? DEFAULT_PAGE));
  queryParams.set("limit", String(params.limit ?? DEFAULT_LIMIT));
  if (params.search?.trim()) queryParams.set("search", params.search.trim());
  if (params.sortBy) queryParams.set("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.set("sortOrder", params.sortOrder);
  if (params.status) queryParams.set("status", params.status);
  if (params.source) queryParams.set("source", params.source);
  if (params.assignedToId) queryParams.set("assignedToId", params.assignedToId);
  return queryParams;
}

/**
 * Fetch leads with pagination. Use in Server Components.
 */
export async function getLeadsServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  params: LeadListParams = {},
): Promise<PaginatedLeadsResponse> {
  const queryParams = buildLeadQueryParams(params);
  const response = await fetchServer(`/leads?${queryParams.toString()}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch leads (${response.status})`;
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
 * Fetch a single lead by ID. Use in Server Components.
 */
export async function getLeadServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  id: string,
): Promise<{ lead: Lead }> {
  if (!id?.trim()) {
    throw new Error("Lead ID is required");
  }

  const response = await fetchServer(`/leads/${id}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch lead (${response.status})`;
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
