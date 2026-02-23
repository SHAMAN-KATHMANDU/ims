/**
 * Server-safe Vendor Service.
 * Use in Server Components and Route Handlers. Do NOT use in client components.
 */

import { fetchServer } from "@/lib/api-server";
import {
  type PaginatedVendorsResponse,
  type VendorListParams,
  type Vendor,
} from "@/services/vendorService";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export { type PaginatedVendorsResponse, type VendorListParams };

/**
 * Fetch vendors with pagination. Use in Server Components.
 */
export async function getVendorsServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  params: VendorListParams = {},
): Promise<PaginatedVendorsResponse> {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    search,
    sortBy,
    sortOrder,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search?.trim()) {
    queryParams.set("search", search.trim());
  }
  if (sortBy) {
    queryParams.set("sortBy", sortBy);
  }
  if (sortOrder) {
    queryParams.set("sortOrder", sortOrder);
  }

  const response = await fetchServer(`/vendors?${queryParams.toString()}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch vendors (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (typeof json?.message === "string") {
        message = json.message;
      }
    } catch {
      // ignore parse error
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
 * Fetch a single vendor by ID. Use in Server Components.
 */
export async function getVendorServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  id: string,
): Promise<Vendor> {
  if (!id?.trim()) {
    throw new Error("Vendor ID is required");
  }

  const response = await fetchServer(`/vendors/${id}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch vendor (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (typeof json?.message === "string") {
        message = json.message;
      }
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  const json = await response.json();
  return json.vendor;
}
