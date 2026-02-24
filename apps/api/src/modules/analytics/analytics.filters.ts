/**
 * Shared analytics filter parsing and Prisma where builder.
 * Single source of truth so all analytics endpoints apply the same filters and role scoping.
 * User role sees only own data (createdById); admin/superAdmin see full workspace data.
 */

import type { Prisma } from "@prisma/client";

export interface AnalyticsFilterInput {
  dateFrom?: string;
  dateTo?: string;
  locationIds?: string[];
  saleType?: "GENERAL" | "MEMBER";
  creditStatus?: "credit" | "non-credit";
  userId?: string;
  categoryId?: string;
  vendorId?: string;
}

/** Parsed filters from query string. Arrays are deduplicated. */
export interface ParsedAnalyticsFilters extends AnalyticsFilterInput {
  dateFrom?: string;
  dateTo?: string;
  locationIds?: string[];
  saleType?: "GENERAL" | "MEMBER";
  creditStatus?: "credit" | "non-credit";
  userId?: string;
  categoryId?: string;
  vendorId?: string;
}

/**
 * Parse analytics filter from Express request query.
 * Supports locationIds as comma-separated or repeated keys.
 */
export function parseAnalyticsFilters(
  query: Record<string, unknown>,
): ParsedAnalyticsFilters {
  const dateFrom =
    typeof query.dateFrom === "string" ? query.dateFrom : undefined;
  const dateTo = typeof query.dateTo === "string" ? query.dateTo : undefined;
  const saleType =
    query.saleType === "GENERAL" || query.saleType === "MEMBER"
      ? query.saleType
      : undefined;
  const creditStatus =
    query.creditStatus === "credit" || query.creditStatus === "non-credit"
      ? query.creditStatus
      : undefined;
  const userId = typeof query.userId === "string" ? query.userId : undefined;
  const categoryId =
    typeof query.categoryId === "string" ? query.categoryId : undefined;
  const vendorId =
    typeof query.vendorId === "string" ? query.vendorId : undefined;

  let locationIds: string[] | undefined;
  if (Array.isArray(query.locationIds)) {
    locationIds = [...new Set((query.locationIds as string[]).filter(Boolean))];
  } else if (typeof query.locationIds === "string") {
    const parts = query.locationIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    locationIds = parts.length ? [...new Set(parts)] : undefined;
  }

  return {
    dateFrom,
    dateTo,
    locationIds,
    saleType,
    creditStatus,
    userId,
    categoryId,
    vendorId,
  };
}

/** Sale where clause for Prisma; use with buildSalesWhereFromFilters + applyRoleToSalesWhere. */
export type SalesWhereFromFilters = Prisma.SaleWhereInput;

/**
 * Build base Sale where from parsed filters (no role applied).
 * Used for analytics aggregations; categoryId/vendorId require joining through items -> variation -> product.
 */
export function buildSalesWhereFromFilters(
  filters: ParsedAnalyticsFilters,
): SalesWhereFromFilters {
  const where: SalesWhereFromFilters = {};

  if (filters.locationIds?.length) {
    where.locationId = { in: filters.locationIds };
  }

  if (filters.saleType) {
    where.type = filters.saleType;
  }

  if (filters.creditStatus === "credit") {
    where.isCreditSale = true;
  } else if (filters.creditStatus === "non-credit") {
    where.isCreditSale = false;
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (filters.userId) {
    where.createdById = filters.userId;
  }

  if (filters.categoryId || filters.vendorId) {
    where.items = {
      some: {
        variation: {
          product: {
            ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
            ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
          },
        },
      },
    };
  }

  return where;
}

/**
 * Apply role to sales where: user role must see only own sales (createdById).
 * Call this after buildSalesWhereFromFilters; pass req.authContext.role and req.authContext.userId (from requireAuth).
 * Admin/superAdmin: no createdById added. User: force createdById to current user and ignore filter userId.
 */
export function applyRoleToSalesWhere(
  where: SalesWhereFromFilters,
  role: string | undefined,
  currentUserId: string | undefined,
): SalesWhereFromFilters {
  if (role === "user" && currentUserId) {
    return { ...where, createdById: currentUserId };
  }
  return where;
}

/**
 * Full pipeline: parse query -> build sales where -> apply role.
 * Returns Prisma SaleWhereInput ready for aggregate/findMany.
 */
export function getSalesWhereForAnalytics(
  query: Record<string, unknown>,
  role: string | undefined,
  currentUserId: string | undefined,
): { filters: ParsedAnalyticsFilters; where: SalesWhereFromFilters } {
  const filters = parseAnalyticsFilters(query);
  const baseWhere = buildSalesWhereFromFilters(filters);
  const where = applyRoleToSalesWhere(baseWhere, role, currentUserId);
  return { filters, where };
}
