/**
 * Server-safe Transfer Service.
 * Use in Server Components and Route Handlers. Do NOT use in client components.
 */

import { fetchServer } from "@/lib/api-server";
import {
  type PaginatedTransfersResponse,
  type TransferListParams,
  type Transfer,
} from "@/services/transferService";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export { type PaginatedTransfersResponse, type TransferListParams };

function buildTransferQueryParams(params: TransferListParams): URLSearchParams {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    search = "",
    status,
    fromLocationId,
    toLocationId,
    locationId,
    sortBy,
    sortOrder,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) queryParams.set("search", search.trim());
  if (status) queryParams.set("status", status);
  if (fromLocationId) queryParams.set("fromLocationId", fromLocationId);
  if (toLocationId) queryParams.set("toLocationId", toLocationId);
  if (locationId) queryParams.set("locationId", locationId);
  if (sortBy) queryParams.set("sortBy", sortBy);
  if (sortOrder) queryParams.set("sortOrder", sortOrder);
  return queryParams;
}

/**
 * Fetch transfers with pagination. Use in Server Components.
 */
export async function getTransfersServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  params: TransferListParams = {},
): Promise<PaginatedTransfersResponse> {
  const queryParams = buildTransferQueryParams(params);
  const response = await fetchServer(`/transfers?${queryParams.toString()}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch transfers (${response.status})`;
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
 * Fetch a single transfer by ID. Use in Server Components.
 */
export async function getTransferServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  id: string,
): Promise<Transfer> {
  if (!id?.trim()) {
    throw new Error("Transfer ID is required");
  }

  const response = await fetchServer(`/transfers/${id}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch transfer (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (typeof json?.message === "string") message = json.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const json = await response.json();
  return json.transfer;
}
