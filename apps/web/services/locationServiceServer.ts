/**
 * Server-safe Location Service.
 * Use in Server Components and Route Handlers. Do NOT use in client components.
 */

import { fetchServer } from "@/lib/api-server";
import {
  type PaginatedLocationsResponse,
  type LocationListParams,
  type Location,
} from "@/services/locationService";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export { type PaginatedLocationsResponse, type LocationListParams };

function buildLocationQueryParams(params: LocationListParams): URLSearchParams {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    search = "",
    type,
    activeOnly,
    status,
    sortBy,
    sortOrder,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) queryParams.set("search", search.trim());
  if (type) queryParams.set("type", type);
  if (activeOnly) queryParams.set("activeOnly", "true");
  if (status && status !== "all") queryParams.set("status", status);
  if (sortBy) queryParams.set("sortBy", sortBy);
  if (sortOrder) queryParams.set("sortOrder", sortOrder);
  return queryParams;
}

/**
 * Fetch locations with pagination. Use in Server Components.
 */
export async function getLocationsServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  params: LocationListParams = {},
): Promise<PaginatedLocationsResponse> {
  const queryParams = buildLocationQueryParams(params);
  const response = await fetchServer(`/locations?${queryParams.toString()}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch locations (${response.status})`;
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
    pagination: json.pagination,
  };
}

/**
 * Fetch a single location by ID. Use in Server Components.
 */
export async function getLocationServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  id: string,
): Promise<Location> {
  if (!id?.trim()) {
    throw new Error("Location ID is required");
  }

  const response = await fetchServer(`/locations/${id}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch location (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (typeof json?.message === "string") message = json.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const json = await response.json();
  return json.location;
}
