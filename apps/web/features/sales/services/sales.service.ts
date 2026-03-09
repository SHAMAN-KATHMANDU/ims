/**
 * Sales Service
 *
 * Single source for sales API calls. All sales HTTP requests must go through this file.
 * Do not add React or UI logic.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import {
  type PaginationMeta,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/lib/apiTypes";
import { downloadBlobFromResponse } from "@/lib/downloadBlob";
import { formatCurrency } from "@/lib/format";
import { validateExcelFile } from "@/lib/fileValidation";
import type {
  Sale,
  SaleType,
  SaleItem,
  SalePayment,
  SalePaymentDetail,
  SalesListParams,
  PaginatedSalesResponse,
  CreateSaleData,
  CreateSaleItem,
  SalesSummary,
  LocationSalesStat,
  DailySalesStat,
  SalePreviewResponse,
  SaleBulkUploadResponse,
  PaymentMethod,
} from "../types";

// Re-export types for consumers
export type {
  Sale,
  SaleType,
  SaleItem,
  SalePayment,
  SalePaymentDetail,
  SalesListParams,
  PaginatedSalesResponse,
  CreateSaleData,
  CreateSaleItem,
  SalesSummary,
  LocationSalesStat,
  DailySalesStat,
  SalePreviewResponse,
  SaleBulkUploadResponse,
};
export type { PaymentMethod } from "../types";
export type { SaleBulkUploadError, SaleBulkUploadSummary } from "../types";

export { DEFAULT_PAGE, DEFAULT_LIMIT };

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

interface AddPaymentResponse {
  message: string;
  sale: Sale;
  payment: SalePaymentDetail & { createdAt?: string };
}

// ============================================
// API Functions
// ============================================

export async function getSales(
  params: SalesListParams = {},
): Promise<PaginatedSalesResponse> {
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

export async function getSaleById(id: string): Promise<Sale> {
  if (!id?.trim()) throw new Error("Sale ID is required");
  try {
    const response = await api.get<SaleResponse>(`/sales/${id}`);
    return response.data.sale;
  } catch (error) {
    handleApiError(error, `fetch sale "${id}"`);
  }
}

export async function addPaymentToSale(
  saleId: string,
  method: PaymentMethod,
  amount: number,
): Promise<Sale> {
  if (!saleId?.trim()) throw new Error("Sale ID is required");
  if (
    !method ||
    !["CASH", "CARD", "CHEQUE", "FONEPAY", "QR"].includes(method)
  ) {
    throw new Error("Valid payment method is required");
  }
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }
  try {
    const response = await api.post<AddPaymentResponse>(
      `/sales/${saleId}/payments`,
      { method, amount },
    );
    return response.data.sale;
  } catch (error) {
    handleApiError(error, "add payment to sale");
  }
}

export async function downloadReceiptPdf(saleId: string): Promise<void> {
  if (!saleId?.trim()) throw new Error("Sale ID is required");
  try {
    const response = await api.get<Blob>(`/sales/${saleId}/receipt`, {
      responseType: "blob",
    });
    downloadBlobFromResponse(response, "receipt.pdf");
  } catch (error) {
    handleApiError(error, "download receipt");
    throw error;
  }
}

export async function getSalesSinceLastLogin(
  params: { page?: number; limit?: number } = {},
): Promise<PaginatedSalesResponse> {
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = params;
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  try {
    const response = await api.get<SalesApiResponse>(
      `/sales/me/since-last-login?${queryParams.toString()}`,
    );
    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch sales since last login");
  }
}

export async function previewSale(
  data: Pick<
    CreateSaleData,
    "locationId" | "memberPhone" | "memberName" | "contactId" | "items"
  >,
): Promise<SalePreviewResponse> {
  if (!data.locationId?.trim() || !data.items?.length) {
    throw new Error("locationId and items required");
  }
  const response = await api.post<SalePreviewResponse>("/sales/preview", {
    locationId: data.locationId,
    memberPhone: data.memberPhone,
    memberName: data.memberName,
    contactId: data.contactId ?? undefined,
    items: data.items.map((i) => ({
      variationId: i.variationId,
      subVariationId: i.subVariationId ?? undefined,
      quantity: i.quantity,
      discountId:
        i.discountId && i.discountId !== "none" ? i.discountId : undefined,
      promoCode: i.promoCode,
    })),
  });
  return response.data;
}

export async function createSale(data: CreateSaleData): Promise<Sale> {
  if (!data.locationId?.trim()) throw new Error("Location ID is required");
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

export async function getSalesSummary(
  params: {
    locationId?: string;
    startDate?: string;
    endDate?: string;
  } = {},
): Promise<SalesSummary> {
  const queryParams = new URLSearchParams();
  if (params.locationId) queryParams.set("locationId", params.locationId);
  if (params.startDate) queryParams.set("startDate", params.startDate);
  if (params.endDate) queryParams.set("endDate", params.endDate);
  try {
    const response = await api.get<SalesSummaryResponse>(
      `/sales/analytics/summary?${queryParams.toString()}`,
    );
    return response.data.summary;
  } catch (error) {
    handleApiError(error, "fetch sales summary");
  }
}

export async function getSalesByLocation(
  params: { startDate?: string; endDate?: string } = {},
): Promise<LocationSalesStat[]> {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.set("startDate", params.startDate);
  if (params.endDate) queryParams.set("endDate", params.endDate);
  try {
    const response = await api.get<LocationSalesResponse>(
      `/sales/analytics/by-location?${queryParams.toString()}`,
    );
    return response.data.data || [];
  } catch (error) {
    handleApiError(error, "fetch sales by location");
  }
}

export async function getDailySales(
  params: { locationId?: string; days?: number } = {},
): Promise<DailySalesStat[]> {
  const queryParams = new URLSearchParams();
  if (params.locationId) queryParams.set("locationId", params.locationId);
  if (params.days) queryParams.set("days", String(params.days));
  try {
    const response = await api.get<DailySalesResponse>(
      `/sales/analytics/daily?${queryParams.toString()}`,
    );
    return response.data.data || [];
  } catch (error) {
    handleApiError(error, "fetch daily sales");
  }
}

// Helper functions
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

export { formatCurrency };

// Bulk upload
export async function bulkUploadSales(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<SaleBulkUploadResponse> {
  validateExcelFile(file);
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<SaleBulkUploadResponse>(
      "/bulk/upload/sales",
      formData,
      {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            onProgress(progress);
          }
        },
      },
    );
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as {
      isAxiosError?: boolean;
      response?: {
        status?: number;
        data?: {
          message?: string;
          missingColumns?: string[];
          hint?: string;
          foundColumns?: string[];
        };
      };
    };
    if (
      axiosError?.isAxiosError &&
      axiosError.response?.status === 400 &&
      axiosError.response?.data
    ) {
      const data = axiosError.response.data;
      const err = new Error(data?.message || "Validation failed") as Error & {
        responseData?: typeof data;
      };
      err.responseData = data;
      throw err;
    }
    handleApiError(error, "bulk upload sales");
  }
}

export async function downloadSales(
  format: "excel" | "csv" = "excel",
  saleIds?: string[],
): Promise<void> {
  try {
    const queryParams = new URLSearchParams();
    queryParams.set("format", format);
    if (saleIds && saleIds.length > 0) {
      queryParams.set("ids", saleIds.join(","));
    }
    queryParams.set("type", "sales");
    const response = await api.get<Blob>(
      `/bulk/download?${queryParams.toString()}`,
      { responseType: "blob" },
    );
    const defaultFilename = `sales_${new Date().toISOString().split("T")[0]}.${
      format === "excel" ? "xlsx" : "csv"
    }`;
    downloadBlobFromResponse(response, defaultFilename);
  } catch (error) {
    handleApiError(error, "download sales");
    throw error;
  }
}

export async function downloadBulkUploadTemplate(): Promise<void> {
  try {
    const response = await api.get<Blob>("/bulk/template?type=sales", {
      responseType: "blob",
    });
    downloadBlobFromResponse(response, "sales_bulk_upload_template.xlsx");
  } catch (error) {
    handleApiError(error, "download template");
    throw error;
  }
}
