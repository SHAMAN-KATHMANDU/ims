/**
 * Sales Service
 *
 * Service layer for sales management operations.
 * Uses the shared axios instance from lib/axios.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";

// ============================================
// Types
// ============================================

export type SaleType = "GENERAL" | "MEMBER";

export interface SaleItem {
  id: string;
  variationId: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
  variation: {
    id: string;
    color: string;
    product: {
      id: string;
      name: string;
      imsCode: string;
      category?: {
        id: string;
        name: string;
      };
    };
    photos?: {
      id: string;
      photoUrl: string;
      isPrimary: boolean;
    }[];
  };
}

export interface Sale {
  id: string;
  saleCode: string;
  type: SaleType;
  locationId: string;
  memberId?: string;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string;
  createdById: string;
  createdAt: string;
  location: {
    id: string;
    name: string;
  };
  member?: {
    id: string;
    phone: string;
    name?: string;
  };
  createdBy: {
    id: string;
    username: string;
  };
  items?: SaleItem[];
  _count?: {
    items: number;
  };
}

export interface SalesListParams {
  page?: number;
  limit?: number;
  locationId?: string;
  type?: SaleType;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedSalesResponse {
  data: Sale[];
  pagination: PaginationMeta;
}

export interface CreateSaleItem {
  variationId: string;
  quantity: number;
}

export interface CreateSaleData {
  locationId: string;
  memberPhone?: string;
  items: CreateSaleItem[];
  notes?: string;
}

export interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  totalDiscount: number;
  generalSales: {
    count: number;
    revenue: number;
  };
  memberSales: {
    count: number;
    revenue: number;
  };
}

export interface LocationSalesStat {
  locationId: string;
  locationName: string;
  totalSales: number;
  totalRevenue: number;
}

export interface DailySalesStat {
  date: string;
  total: number;
  count: number;
  general: number;
  member: number;
}

// API Response types
interface SalesApiResponse {
  message: string;
  data: Sale[];
  pagination: PaginationMeta;
}

interface SaleResponse {
  message: string;
  sale: Sale;
}

interface SalesSummaryResponse {
  message: string;
  summary: SalesSummary;
}

interface LocationSalesResponse {
  message: string;
  data: LocationSalesStat[];
}

interface DailySalesResponse {
  message: string;
  data: DailySalesStat[];
}

// ============================================
// API Functions
// ============================================

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;

/**
 * Get all sales with pagination and filtering
 */
export async function getSales(
  params: SalesListParams = {},
): Promise<PaginatedSalesResponse> {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    locationId,
    type,
    startDate,
    endDate,
    search,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (locationId) {
    queryParams.set("locationId", locationId);
  }
  if (type) {
    queryParams.set("type", type);
  }
  if (startDate) {
    queryParams.set("startDate", startDate);
  }
  if (endDate) {
    queryParams.set("endDate", endDate);
  }
  if (search?.trim()) {
    queryParams.set("search", search.trim());
  }

  try {
    const response = await api.get<SalesApiResponse>(
      `/sales?${queryParams.toString()}`,
    );
    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch sales");
  }
}

/**
 * Get sale by ID with full details
 */
export async function getSaleById(id: string): Promise<Sale> {
  if (!id?.trim()) {
    throw new Error("Sale ID is required");
  }

  try {
    const response = await api.get<SaleResponse>(`/sales/${id}`);
    return response.data.sale;
  } catch (error) {
    handleApiError(error, `fetch sale "${id}"`);
  }
}

/**
 * Create a new sale
 */
export async function createSale(data: CreateSaleData): Promise<Sale> {
  if (!data.locationId?.trim()) {
    throw new Error("Location ID is required");
  }
  if (!data.items || data.items.length === 0) {
    throw new Error("At least one item is required");
  }

  try {
    const response = await api.post<SaleResponse>("/sales", data);
    return response.data.sale;
  } catch (error) {
    handleApiError(error, "create sale");
  }
}

/**
 * Get sales summary analytics
 */
export async function getSalesSummary(
  params: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
  } = {},
): Promise<SalesSummary> {
  const queryParams = new URLSearchParams();
  if (params.locationId) {
    queryParams.set("locationId", params.locationId);
  }
  if (params.startDate) {
    queryParams.set("startDate", params.startDate);
  }
  if (params.endDate) {
    queryParams.set("endDate", params.endDate);
  }

  try {
    const response = await api.get<SalesSummaryResponse>(
      `/sales/analytics/summary?${queryParams.toString()}`,
    );
    return response.data.summary;
  } catch (error) {
    handleApiError(error, "fetch sales summary");
  }
}

/**
 * Get sales by location analytics
 */
export async function getSalesByLocation(
  params: {
    startDate?: string;
    endDate?: string;
  } = {},
): Promise<LocationSalesStat[]> {
  const queryParams = new URLSearchParams();
  if (params.startDate) {
    queryParams.set("startDate", params.startDate);
  }
  if (params.endDate) {
    queryParams.set("endDate", params.endDate);
  }

  try {
    const response = await api.get<LocationSalesResponse>(
      `/sales/analytics/by-location?${queryParams.toString()}`,
    );
    return response.data.data || [];
  } catch (error) {
    handleApiError(error, "fetch sales by location");
  }
}

/**
 * Get daily sales analytics
 */
export async function getDailySales(
  params: {
    locationId?: string;
    days?: number;
  } = {},
): Promise<DailySalesStat[]> {
  const queryParams = new URLSearchParams();
  if (params.locationId) {
    queryParams.set("locationId", params.locationId);
  }
  if (params.days) {
    queryParams.set("days", String(params.days));
  }

  try {
    const response = await api.get<DailySalesResponse>(
      `/sales/analytics/daily?${queryParams.toString()}`,
    );
    return response.data.data || [];
  } catch (error) {
    handleApiError(error, "fetch daily sales");
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get display label for sale type
 */
export function getSaleTypeLabel(type: SaleType): string {
  switch (type) {
    case "GENERAL":
      return "General";
    case "MEMBER":
      return "Member";
    default:
      return type;
  }
}

/**
 * Get color for sale type badge
 */
export function getSaleTypeColor(type: SaleType): string {
  switch (type) {
    case "GENERAL":
      return "bg-gray-100 text-gray-800";
    case "MEMBER":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
