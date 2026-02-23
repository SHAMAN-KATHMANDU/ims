/**
 * Server-safe Contact Service.
 * Use in Server Components and Route Handlers. Do NOT use in client components.
 */

import { fetchServer } from "@/lib/api-server";
import {
  type PaginatedContactsResponse,
  type ContactListParams,
  type ContactDetail,
} from "@/services/contactService";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export { type PaginatedContactsResponse, type ContactListParams };

function buildContactQueryParams(params: ContactListParams): URLSearchParams {
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(params.page ?? DEFAULT_PAGE));
  queryParams.set("limit", String(params.limit ?? DEFAULT_LIMIT));
  if (params.search?.trim()) queryParams.set("search", params.search.trim());
  if (params.sortBy) queryParams.set("sortBy", params.sortBy);
  if (params.sortOrder) queryParams.set("sortOrder", params.sortOrder);
  if (params.companyId) queryParams.set("companyId", params.companyId);
  if (params.tagId) queryParams.set("tagId", params.tagId);
  if (params.ownerId) queryParams.set("ownerId", params.ownerId);
  return queryParams;
}

/**
 * Fetch contacts with pagination. Use in Server Components.
 */
export async function getContactsServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  params: ContactListParams = {},
): Promise<PaginatedContactsResponse> {
  const queryParams = buildContactQueryParams(params);
  const response = await fetchServer(`/contacts?${queryParams.toString()}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch contacts (${response.status})`;
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
 * Fetch a single contact by ID. Use in Server Components.
 */
export async function getContactServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  id: string,
): Promise<{ contact: ContactDetail }> {
  if (!id?.trim()) {
    throw new Error("Contact ID is required");
  }

  const response = await fetchServer(`/contacts/${id}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch contact (${response.status})`;
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
