/**
 * Server-safe Sales Service.
 * Use in Server Components and Route Handlers. Do NOT use in client components.
 */

import { fetchServer } from "@/lib/api-server";
import {
  type PaginatedSalesResponse,
  type SalesListParams,
  type Sale,
} from "@/services/salesService";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export { type PaginatedSalesResponse, type SalesListParams };

function buildSalesQueryParams(params: SalesListParams): URLSearchParams {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    locationId,
    createdById,
    type,
    isCreditSale,
    startDate,
    endDate,
    search,
    sortBy,
    sortOrder,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (locationId) queryParams.set("locationId", locationId);
  if (createdById) queryParams.set("createdById", createdById);
  if (type) queryParams.set("type", type);
  if (isCreditSale === true) queryParams.set("isCreditSale", "true");
  else if (isCreditSale === false) queryParams.set("isCreditSale", "false");
  if (startDate) queryParams.set("startDate", startDate);
  if (endDate) queryParams.set("endDate", endDate);
  if (search?.trim()) queryParams.set("search", search.trim());
  if (sortBy) queryParams.set("sortBy", sortBy);
  if (sortOrder) queryParams.set("sortOrder", sortOrder);
  return queryParams;
}

/**
 * Fetch sales with pagination. Use in Server Components.
 */
export async function getSalesServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  params: SalesListParams = {},
): Promise<PaginatedSalesResponse> {
  const queryParams = buildSalesQueryParams(params);
  const response = await fetchServer(`/sales?${queryParams.toString()}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch sales (${response.status})`;
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
 * Fetch a single sale by ID. Use in Server Components.
 */
export async function getSaleServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  id: string,
): Promise<Sale> {
  if (!id?.trim()) {
    throw new Error("Sale ID is required");
  }

  const response = await fetchServer(`/sales/${id}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch sale (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (typeof json?.message === "string") message = json.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const json = await response.json();
  return json.sale;
}
