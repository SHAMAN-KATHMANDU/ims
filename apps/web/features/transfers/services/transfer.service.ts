/**
 * Transfer Service
 *
 * Service layer for product transfer management between locations.
 * Uses the shared axios instance from lib/axios.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import {
  type PaginationMeta,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/lib/apiTypes";
import type { LocationType } from "@/features/locations";

// ============================================
// Types
// ============================================

export type TransferStatus =
  | "PENDING"
  | "APPROVED"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "CANCELLED";

export interface TransferItem {
  id: string;
  transferId: string;
  variationId: string;
  subVariationId?: string | null;
  quantity: number;
  variation: {
    id: string;
    product: {
      id: string;
      imsCode: string;
      name: string;
      category?: {
        id: string;
        name: string;
      };
    };
    attributes?: Array<{
      attributeType: { name: string };
      attributeValue: { value: string };
    }>;
    photos?: Array<{
      id: string;
      photoUrl: string;
      isPrimary: boolean;
    }>;
  };
  subVariation?: { id: string; name: string } | null;
}

export interface TransferLog {
  id: string;
  transferId: string;
  action: string;
  details?: Record<string, unknown>;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
  };
}

export interface TransferLocation {
  id: string;
  name: string;
  type: LocationType;
}

export interface Transfer {
  id: string;
  transferCode: string;
  fromLocationId: string;
  toLocationId: string;
  status: TransferStatus;
  notes?: string;
  createdById: string;
  approvedById?: string;
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
  fromLocation: TransferLocation;
  toLocation: TransferLocation;
  createdBy: {
    id: string;
    username: string;
    role?: string;
  };
  approvedBy?: {
    id: string;
    username: string;
    role?: string;
  };
  items?: TransferItem[];
  logs?: TransferLog[];
  _count?: {
    items: number;
  };
}

export interface TransferListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: TransferStatus;
  fromLocationId?: string;
  toLocationId?: string;
  locationId?: string; // Either from or to
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedTransfersResponse {
  data: Transfer[];
  pagination: PaginationMeta;
}

export interface CreateTransferData {
  fromLocationId: string;
  toLocationId: string;
  items: Array<{
    variationId: string;
    subVariationId?: string | null;
    quantity: number;
  }>;
  notes?: string;
}

interface TransfersApiResponse {
  message: string;
  data: Transfer[];
  pagination: PaginationMeta;
}

interface TransferResponse {
  message: string;
  transfer: Transfer;
}

interface TransferLogsResponse {
  message: string;
  transferCode: string;
  logs: TransferLog[];
}

// ============================================
// API Functions
// ============================================

export { DEFAULT_PAGE, DEFAULT_LIMIT };

/**
 * Get all transfers with filtering
 */
export async function getTransfers(
  params: TransferListParams = {},
): Promise<PaginatedTransfersResponse> {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    search = "",
    status,
    fromLocationId,
    toLocationId,
    locationId,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search.trim()) {
    queryParams.set("search", search.trim());
  }
  if (status) {
    queryParams.set("status", status);
  }
  if (fromLocationId) {
    queryParams.set("fromLocationId", fromLocationId);
  }
  if (toLocationId) {
    queryParams.set("toLocationId", toLocationId);
  }
  if (locationId) {
    queryParams.set("locationId", locationId);
  }
  if (dateFrom) {
    queryParams.set("dateFrom", dateFrom);
  }
  if (dateTo) {
    queryParams.set("dateTo", dateTo);
  }
  if (sortBy) {
    queryParams.set("sortBy", sortBy);
  }
  if (sortOrder) {
    queryParams.set("sortOrder", sortOrder);
  }

  try {
    const response = await api.get<TransfersApiResponse>(
      `/transfers?${queryParams.toString()}`,
    );
    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch transfers");
  }
}

/**
 * Get transfer by ID with full details
 */
export async function getTransferById(id: string): Promise<Transfer> {
  if (!id?.trim()) {
    throw new Error("Transfer ID is required");
  }

  try {
    const response = await api.get<TransferResponse>(`/transfers/${id}`);
    return response.data.transfer;
  } catch (error) {
    handleApiError(error, `fetch transfer "${id}"`);
  }
}

/**
 * Get transfer logs
 */
export async function getTransferLogs(
  transferId: string,
): Promise<{ transferCode: string; logs: TransferLog[] }> {
  if (!transferId?.trim()) {
    throw new Error("Transfer ID is required");
  }

  try {
    const response = await api.get<TransferLogsResponse>(
      `/transfers/${transferId}/logs`,
    );
    return {
      transferCode: response.data.transferCode,
      logs: response.data.logs || [],
    };
  } catch (error) {
    handleApiError(error, `fetch transfer logs "${transferId}"`);
  }
}

/**
 * Create a new transfer request
 */
export async function createTransfer(
  data: CreateTransferData,
): Promise<Transfer> {
  if (!data.fromLocationId?.trim()) {
    throw new Error("Source location is required");
  }
  if (!data.toLocationId?.trim()) {
    throw new Error("Destination location is required");
  }
  if (!data.items || data.items.length === 0) {
    throw new Error("At least one item is required");
  }
  if (data.fromLocationId === data.toLocationId) {
    throw new Error("Source and destination cannot be the same");
  }

  // Validate each item
  for (const item of data.items) {
    if (!item.variationId?.trim()) {
      throw new Error("Each item must have a variation ID");
    }
    if (typeof item.quantity !== "number" || item.quantity <= 0) {
      throw new Error("Each item must have a positive quantity");
    }
  }

  try {
    const response = await api.post<TransferResponse>("/transfers", data);
    return response.data.transfer;
  } catch (error) {
    handleApiError(error, "create transfer");
  }
}

/**
 * Approve a pending transfer
 */
export async function approveTransfer(id: string): Promise<Transfer> {
  if (!id?.trim()) {
    throw new Error("Transfer ID is required");
  }

  try {
    const response = await api.put<TransferResponse>(
      `/transfers/${id}/approve`,
    );
    return response.data.transfer;
  } catch (error) {
    handleApiError(error, `approve transfer "${id}"`);
  }
}

/**
 * Start transit (deducts stock from source)
 */
export async function startTransit(id: string): Promise<Transfer> {
  if (!id?.trim()) {
    throw new Error("Transfer ID is required");
  }

  try {
    const response = await api.put<TransferResponse>(
      `/transfers/${id}/transit`,
    );
    return response.data.transfer;
  } catch (error) {
    handleApiError(error, `start transit "${id}"`);
  }
}

/**
 * Complete transfer (adds stock to destination)
 */
export async function completeTransfer(id: string): Promise<Transfer> {
  if (!id?.trim()) {
    throw new Error("Transfer ID is required");
  }

  try {
    const response = await api.put<TransferResponse>(
      `/transfers/${id}/complete`,
    );
    return response.data.transfer;
  } catch (error) {
    handleApiError(error, `complete transfer "${id}"`);
  }
}

/**
 * Cancel a transfer
 */
export async function cancelTransfer(
  id: string,
  reason?: string,
): Promise<Transfer> {
  if (!id?.trim()) {
    throw new Error("Transfer ID is required");
  }

  try {
    const response = await api.put<TransferResponse>(
      `/transfers/${id}/cancel`,
      {
        reason,
      },
    );
    return response.data.transfer;
  } catch (error) {
    handleApiError(error, `cancel transfer "${id}"`);
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get status badge color for a transfer status
 */
export function getStatusColor(
  status: TransferStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PENDING":
      return "secondary";
    case "APPROVED":
      return "default";
    case "IN_TRANSIT":
      return "outline";
    case "COMPLETED":
      return "default";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: TransferStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending Approval";
    case "APPROVED":
      return "Approved";
    case "IN_TRANSIT":
      return "In Transit";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

/**
 * Check if a transfer can be approved
 */
export function canApprove(transfer: Transfer): boolean {
  return transfer.status === "PENDING";
}

/**
 * Check if a transfer can start transit
 */
export function canStartTransit(transfer: Transfer): boolean {
  return transfer.status === "APPROVED";
}

/**
 * Check if a transfer can be completed
 */
export function canComplete(transfer: Transfer): boolean {
  return transfer.status === "IN_TRANSIT";
}

/**
 * Check if a transfer can be cancelled
 */
export function canCancel(transfer: Transfer): boolean {
  return transfer.status !== "COMPLETED" && transfer.status !== "CANCELLED";
}
