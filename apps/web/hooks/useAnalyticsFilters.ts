"use client";

/**
 * Single source of truth for analytics filters: state lives in URL so filters are shareable
 * and consistent across Sales & Revenue, Inventory & Operations, and Customers/Promos pages.
 */

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";

export type AnalyticsSaleType = "GENERAL" | "MEMBER";
export type AnalyticsCreditStatus = "all" | "credit" | "non-credit";

export interface AnalyticsFilters {
  dateFrom: string | undefined;
  dateTo: string | undefined;
  preset: string | undefined;
  locationIds: string[];
  saleType: AnalyticsSaleType | undefined;
  creditStatus: AnalyticsCreditStatus;
  userId: string | undefined;
  categoryId: string | undefined;
  vendorId: string | undefined;
}

export interface AnalyticsFiltersUpdate {
  dateFrom?: string;
  dateTo?: string;
  preset?: string;
  locationIds?: string[];
  saleType?: AnalyticsSaleType | "all";
  creditStatus?: AnalyticsCreditStatus;
  userId?: string;
  categoryId?: string;
  vendorId?: string;
}

export const ANALYTICS_PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
  { id: "last90", label: "Last 90 days" },
  { id: "thisMonth", label: "This month" },
  { id: "custom", label: "Custom" },
] as const;

function getPresetRange(
  preset: string,
): { dateFrom: string; dateTo: string } | null {
  const now = new Date();
  switch (preset) {
    case "today": {
      const start = startOfDay(now);
      const end = endOfDay(now);
      return {
        dateFrom: format(start, "yyyy-MM-dd"),
        dateTo: format(end, "yyyy-MM-dd"),
      };
    }
    case "yesterday": {
      const y = subDays(now, 1);
      return {
        dateFrom: format(startOfDay(y), "yyyy-MM-dd"),
        dateTo: format(endOfDay(y), "yyyy-MM-dd"),
      };
    }
    case "last7": {
      const start = startOfDay(subDays(now, 6));
      return {
        dateFrom: format(start, "yyyy-MM-dd"),
        dateTo: format(now, "yyyy-MM-dd"),
      };
    }
    case "last30": {
      const start = startOfDay(subDays(now, 29));
      return {
        dateFrom: format(start, "yyyy-MM-dd"),
        dateTo: format(now, "yyyy-MM-dd"),
      };
    }
    case "last90": {
      const start = startOfDay(subDays(now, 89));
      return {
        dateFrom: format(start, "yyyy-MM-dd"),
        dateTo: format(now, "yyyy-MM-dd"),
      };
    }
    case "thisMonth": {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return {
        dateFrom: format(start, "yyyy-MM-dd"),
        dateTo: format(end, "yyyy-MM-dd"),
      };
    }
    default:
      return null;
  }
}

const DEFAULT_FILTERS: AnalyticsFilters = {
  dateFrom: undefined,
  dateTo: undefined,
  preset: "last30",
  locationIds: [],
  saleType: undefined,
  creditStatus: "all",
  userId: undefined,
  categoryId: undefined,
  vendorId: undefined,
};

function parseFiltersFromSearchParams(
  params: URLSearchParams,
): AnalyticsFilters {
  const preset = params.get("preset") ?? DEFAULT_FILTERS.preset;
  const presetRange =
    preset && preset !== "custom" ? getPresetRange(preset) : null;
  const dateFrom = params.get("dateFrom") ?? presetRange?.dateFrom ?? undefined;
  const dateTo = params.get("dateTo") ?? presetRange?.dateTo ?? undefined;

  const locationIdsParam = params.get("locationIds");
  const locationIds = locationIdsParam
    ? locationIdsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const saleTypeParam = params.get("saleType");
  const saleType =
    saleTypeParam === "GENERAL" || saleTypeParam === "MEMBER"
      ? saleTypeParam
      : undefined;

  const creditStatusParam = params.get("creditStatus");
  const creditStatus: AnalyticsCreditStatus =
    creditStatusParam === "credit" || creditStatusParam === "non-credit"
      ? creditStatusParam
      : "all";

  const userId = params.get("userId") ?? undefined;
  const categoryId = params.get("categoryId") ?? undefined;
  const vendorId = params.get("vendorId") ?? undefined;

  return {
    dateFrom,
    dateTo,
    preset: preset ?? undefined,
    locationIds,
    saleType,
    creditStatus,
    userId,
    categoryId,
    vendorId,
  };
}

function filtersToSearchParams(
  update: AnalyticsFiltersUpdate,
): URLSearchParams {
  const params = new URLSearchParams();
  if (update.dateFrom != null) params.set("dateFrom", update.dateFrom);
  if (update.dateTo != null) params.set("dateTo", update.dateTo);
  if (update.preset != null) params.set("preset", update.preset);
  if (update.locationIds != null && update.locationIds.length > 0)
    params.set("locationIds", update.locationIds.join(","));
  if (update.saleType != null && update.saleType !== "all")
    params.set("saleType", update.saleType);
  if (update.creditStatus != null && update.creditStatus !== "all")
    params.set("creditStatus", update.creditStatus);
  if (update.userId != null) params.set("userId", update.userId);
  if (update.categoryId != null) params.set("categoryId", update.categoryId);
  if (update.vendorId != null) params.set("vendorId", update.vendorId);
  return params;
}

/**
 * Returns filters parsed from URL and a setter that updates URL (merge with current params).
 * Use the same hook on all three analytics pages so filter state is shared via URL.
 */
export function useAnalyticsFilters(): {
  filters: AnalyticsFilters;
  /** API-ready params: dateFrom, dateTo, locationIds, saleType, creditStatus, userId, categoryId, vendorId */
  apiParams: Record<string, string | string[] | undefined>;
  setFilters: (update: AnalyticsFiltersUpdate) => void;
  setPreset: (preset: string) => void;
  setDateRange: (dateFrom: string, dateTo: string) => void;
} {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  const apiParams = useMemo(() => {
    const p: Record<string, string | string[] | undefined> = {};
    if (filters.dateFrom) p.dateFrom = filters.dateFrom;
    if (filters.dateTo) p.dateTo = filters.dateTo;
    if (filters.locationIds.length) p.locationIds = filters.locationIds;
    if (filters.saleType) p.saleType = filters.saleType;
    if (filters.creditStatus !== "all") p.creditStatus = filters.creditStatus;
    if (filters.userId) p.userId = filters.userId;
    if (filters.categoryId) p.categoryId = filters.categoryId;
    if (filters.vendorId) p.vendorId = filters.vendorId;
    return p;
  }, [filters]);

  const setFilters = useCallback(
    (update: AnalyticsFiltersUpdate) => {
      const next = new URLSearchParams(searchParams.toString());
      const built = filtersToSearchParams(update);
      built.forEach((value, key) => next.set(key, value));
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const setPreset = useCallback(
    (preset: string) => {
      const range = preset !== "custom" ? getPresetRange(preset) : null;
      const next = new URLSearchParams(searchParams.toString());
      next.set("preset", preset);
      if (range) {
        next.set("dateFrom", range.dateFrom);
        next.set("dateTo", range.dateTo);
      }
      router.replace(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const setDateRange = useCallback(
    (dateFrom: string, dateTo: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("preset", "custom");
      next.set("dateFrom", dateFrom);
      next.set("dateTo", dateTo);
      router.replace(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  return { filters, apiParams, setFilters, setPreset, setDateRange };
}
