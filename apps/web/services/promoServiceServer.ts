/**
 * Server-safe Promo Service.
 * Use in Server Components and Route Handlers. Do NOT use in client components.
 */

import { fetchServer } from "@/lib/api-server";
import {
  type PaginatedPromosResponse,
  type PromoListParams,
  type PromoCode,
} from "@/services/promoService";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export { type PaginatedPromosResponse, type PromoListParams };

function buildPromoQueryParams(params: PromoListParams): URLSearchParams {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    search,
    isActive,
    sortBy,
    sortOrder,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search?.trim()) queryParams.set("search", search.trim());
  if (typeof isActive === "boolean")
    queryParams.set("isActive", String(isActive));
  if (sortBy) queryParams.set("sortBy", sortBy);
  if (sortOrder) queryParams.set("sortOrder", sortOrder);
  return queryParams;
}

/**
 * Fetch promos with pagination. Use in Server Components.
 */
export async function getPromosServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  params: PromoListParams = {},
): Promise<PaginatedPromosResponse> {
  const queryParams = buildPromoQueryParams(params);
  const response = await fetchServer(`/promos?${queryParams.toString()}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch promos (${response.status})`;
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
 * Fetch a single promo by ID. Use in Server Components.
 */
export async function getPromoServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  id: string,
): Promise<PromoCode> {
  if (!id?.trim()) {
    throw new Error("Promo ID is required");
  }

  const response = await fetchServer(`/promos/${id}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch promo (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (typeof json?.message === "string") message = json.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const json = await response.json();
  return json.promo;
}
