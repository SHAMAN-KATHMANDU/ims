/**
 * Server-safe Member Service.
 * Use in Server Components and Route Handlers. Do NOT use in client components.
 */

import { fetchServer } from "@/lib/api-server";
import {
  type PaginatedMembersResponse,
  type MemberListParams,
  type MemberWithSales,
} from "@/services/memberService";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export { type PaginatedMembersResponse, type MemberListParams };

/**
 * Fetch a single member by ID (with purchase history). Use in Server Components.
 */
export async function getMemberServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  id: string,
): Promise<MemberWithSales> {
  if (!id?.trim()) {
    throw new Error("Member ID is required");
  }

  const response = await fetchServer(`/members/${id}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch member (${response.status})`;
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
  return json.member;
}

/**
 * Fetch members with pagination. Use in Server Components.
 */
export async function getMembersServer(
  cookie: string | null | undefined,
  tenantSlug: string,
  params: MemberListParams = {},
): Promise<PaginatedMembersResponse> {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    search = "",
    sortBy,
    sortOrder,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) {
    queryParams.set("search", search.trim());
  }
  if (sortBy) {
    queryParams.set("sortBy", sortBy);
  }
  if (sortOrder) {
    queryParams.set("sortOrder", sortOrder);
  }

  const response = await fetchServer(`/members?${queryParams.toString()}`, {
    cookie: cookie ?? undefined,
    tenantSlug,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to fetch members (${response.status})`;
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
