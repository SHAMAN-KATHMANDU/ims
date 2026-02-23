/**
 * Utilities for normalizing URL search params from Next.js pages.
 */

import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

export interface NormalizedSearchParams {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface NormalizeSearchParamsOptions {
  defaultSortBy?: string;
  defaultSortOrder?: "asc" | "desc";
}

/**
 * Extract pagination and sort params from URL search params.
 * Handles ReadonlyURLSearchParams from Next.js page searchParams.
 */
export function normalizeSearchParams(
  searchParams:
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
  options: NormalizeSearchParamsOptions = {},
): NormalizedSearchParams {
  const defaultSortBy = options.defaultSortBy ?? "createdAt";
  const defaultSortOrder = options.defaultSortOrder ?? "desc";

  if (!searchParams) {
    return {
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
      search: "",
      sortBy: defaultSortBy,
      sortOrder: defaultSortOrder,
    };
  }

  const getString = (key: string): string => {
    const v = searchParams[key];
    if (Array.isArray(v)) return (v[0] ?? "").trim();
    return (typeof v === "string" ? v : "").trim();
  };

  const pageRaw = getString("page");
  const limitRaw = getString("limit");
  const page = Math.max(1, parseInt(pageRaw, 10) || DEFAULT_PAGE);
  const limit = Math.max(
    1,
    Math.min(100, parseInt(limitRaw, 10) || DEFAULT_LIMIT),
  );

  const sortBy = getString("sortBy") || defaultSortBy;
  const sortOrderRaw = getString("sortOrder").toLowerCase();
  const sortOrder: "asc" | "desc" = sortOrderRaw === "asc" ? "asc" : "desc";

  return {
    page,
    limit,
    search: getString("search"),
    sortBy,
    sortOrder,
  };
}

/**
 * Build sales list params from URL search params.
 */
export function buildSalesListParamsFromSearch(
  searchParams:
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
): {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  locationId?: string;
  createdById?: string;
  type?: string;
  isCreditSale?: boolean;
  startDate?: string;
  endDate?: string;
} {
  const base = normalizeSearchParams(searchParams);
  if (!searchParams) return base;

  const getString = (key: string): string => {
    const v = searchParams[key];
    if (Array.isArray(v)) return (v[0] ?? "").trim();
    return (typeof v === "string" ? v : "").trim();
  };

  const locationId = getString("locationId") || undefined;
  const createdById =
    getString("userId") || getString("createdById") || undefined;
  const typeRaw = getString("type");
  const type: "GENERAL" | "MEMBER" | undefined =
    typeRaw === "GENERAL" || typeRaw === "MEMBER" ? typeRaw : undefined;
  const credit = getString("credit");
  const isCreditSale =
    credit === "credit" ? true : credit === "non-credit" ? false : undefined;
  const startDate = getString("start") || undefined;
  const endDate = getString("end") || undefined;

  return {
    ...base,
    locationId,
    createdById,
    type,
    isCreditSale,
    startDate,
    endDate,
  };
}

/**
 * Build product list params from URL search params.
 */
export function buildProductListParamsFromSearch(
  searchParams:
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
): {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  locationId?: string;
  categoryId?: string;
  vendorId?: string;
} {
  const base = normalizeSearchParams(searchParams, {
    defaultSortBy: "dateCreated",
    defaultSortOrder: "desc",
  });
  if (!searchParams) return base;

  const getString = (key: string): string => {
    const v = searchParams[key];
    if (Array.isArray(v)) return (v[0] ?? "").trim();
    return (typeof v === "string" ? v : "").trim();
  };

  return {
    ...base,
    locationId: getString("locationId") || undefined,
    categoryId: getString("categoryId") || undefined,
    vendorId: getString("vendorId") || undefined,
  };
}

/**
 * Build location list params from URL search params.
 */
export function buildLocationListParamsFromSearch(
  searchParams:
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
) {
  const base = normalizeSearchParams(searchParams, {
    defaultSortBy: "name",
    defaultSortOrder: "asc",
  });
  if (!searchParams) return base;
  const getString = (key: string): string => {
    const v = searchParams[key];
    if (Array.isArray(v)) return (v[0] ?? "").trim();
    return (typeof v === "string" ? v : "").trim();
  };
  const statusRaw = getString("status");
  const status: "all" | "active" | "inactive" =
    statusRaw === "active" || statusRaw === "inactive" ? statusRaw : "all";
  const typeRaw = getString("type");
  const type: "WAREHOUSE" | "SHOWROOM" | undefined =
    typeRaw === "WAREHOUSE" || typeRaw === "SHOWROOM" ? typeRaw : undefined;
  return {
    ...base,
    type,
    status,
  };
}

/**
 * Build promo list params from URL search params.
 */
export function buildPromoListParamsFromSearch(
  searchParams:
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
) {
  const base = normalizeSearchParams(searchParams, {
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
  });
  if (!searchParams) return { ...base, isActive: true };
  const getString = (key: string): string => {
    const v = searchParams[key];
    if (Array.isArray(v)) return (v[0] ?? "").trim();
    return (typeof v === "string" ? v : "").trim();
  };
  const active = getString("active");
  const isActive = active === "false" ? false : active === "true" ? true : true;
  return { ...base, isActive };
}

/**
 * Build transfer list params from URL search params.
 */
export function buildTransferListParamsFromSearch(
  searchParams:
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
) {
  const base = normalizeSearchParams(searchParams, {
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
  });
  if (!searchParams) return base;
  const getString = (key: string): string => {
    const v = searchParams[key];
    if (Array.isArray(v)) return (v[0] ?? "").trim();
    return (typeof v === "string" ? v : "").trim();
  };
  const statusRaw = getString("status");
  const status:
    | "PENDING"
    | "APPROVED"
    | "IN_TRANSIT"
    | "COMPLETED"
    | "CANCELLED"
    | undefined = [
    "PENDING",
    "APPROVED",
    "IN_TRANSIT",
    "COMPLETED",
    "CANCELLED",
  ].includes(statusRaw)
    ? (statusRaw as
        | "PENDING"
        | "APPROVED"
        | "IN_TRANSIT"
        | "COMPLETED"
        | "CANCELLED")
    : undefined;
  return {
    ...base,
    status,
    fromLocationId: getString("fromLocationId") || undefined,
    toLocationId: getString("toLocationId") || undefined,
    locationId: getString("locationId") || undefined,
  };
}

/**
 * Build contact list params from URL search params.
 */
export function buildContactListParamsFromSearch(
  searchParams:
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
) {
  const base = normalizeSearchParams(searchParams);
  if (!searchParams) return base;
  const getString = (key: string): string => {
    const v = searchParams[key];
    if (Array.isArray(v)) return (v[0] ?? "").trim();
    return (typeof v === "string" ? v : "").trim();
  };
  return {
    ...base,
    companyId: getString("companyId") || undefined,
    tagId: getString("tagId") || undefined,
    ownerId: getString("ownerId") || undefined,
  };
}

/**
 * Build lead list params from URL search params.
 */
export function buildLeadListParamsFromSearch(
  searchParams:
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
) {
  const base = normalizeSearchParams(searchParams);
  if (!searchParams) return base;
  const getString = (key: string): string => {
    const v = searchParams[key];
    if (Array.isArray(v)) return (v[0] ?? "").trim();
    return (typeof v === "string" ? v : "").trim();
  };
  const statusRaw = getString("status");
  const status = [
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "LOST",
    "CONVERTED",
  ].includes(statusRaw)
    ? (statusRaw as "NEW" | "CONTACTED" | "QUALIFIED" | "LOST" | "CONVERTED")
    : undefined;
  return { ...base, status };
}

/**
 * Build task list params from URL search params.
 */
export function buildTaskListParamsFromSearch(
  searchParams:
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
) {
  const base = normalizeSearchParams(searchParams, {
    defaultSortBy: "dueDate",
    defaultSortOrder: "asc",
  });
  if (!searchParams) return base;
  const getString = (key: string): string => {
    const v = searchParams[key];
    if (Array.isArray(v)) return (v[0] ?? "").trim();
    return (typeof v === "string" ? v : "").trim();
  };
  const completedRaw = getString("completed");
  const completed =
    completedRaw === "true"
      ? true
      : completedRaw === "false"
        ? false
        : undefined;
  const dueToday = getString("dueToday") === "true";
  return { ...base, completed, dueToday: dueToday || undefined };
}
