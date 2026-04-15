/**
 * Website Orders Service — admin endpoints under /website-orders/*.
 * Available to admin / superAdmin after the platform has enabled the
 * website feature.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

// ============================================
// Types
// ============================================

export type WebsiteOrderStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED"
  | "CONVERTED_TO_SALE";

export interface CartItemSnapshot {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface WebsiteOrderListItem {
  id: string;
  tenantId: string;
  orderCode: string;
  status: WebsiteOrderStatus;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  items: CartItemSnapshot[];
  subtotal: string;
  currency: string;
  verifiedAt: string | null;
  rejectedAt: string | null;
  convertedAt: string | null;
  convertedSaleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteOrder extends WebsiteOrderListItem {
  customerNote: string | null;
  rejectionReason: string | null;
  sourceIp: string | null;
  sourceUserAgent: string | null;
  verifiedById: string | null;
  rejectedById: string | null;
  convertedById: string | null;
}

export interface ListWebsiteOrdersQuery {
  page?: number;
  limit?: number;
  status?: WebsiteOrderStatus;
  search?: string;
}

export interface WebsiteOrderList {
  orders: WebsiteOrderListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface RejectOrderData {
  reason: string;
}

export interface ConvertOrderPaymentInput {
  method: string;
  amount: number;
}

export interface ConvertOrderData {
  locationId: string;
  isCreditSale?: boolean;
  payments?: ConvertOrderPaymentInput[];
}

// ============================================
// API
// ============================================

export async function listWebsiteOrders(
  query: ListWebsiteOrdersQuery = {},
): Promise<WebsiteOrderList> {
  try {
    const response = await api.get<WebsiteOrderList>("/website-orders", {
      params: query,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "list website orders");
  }
}

export async function getWebsiteOrder(id: string): Promise<WebsiteOrder> {
  if (!id) throw new Error("Order id is required");
  try {
    const response = await api.get<{ order: WebsiteOrder }>(
      `/website-orders/${id}`,
    );
    return response.data.order;
  } catch (error) {
    handleApiError(error, "fetch website order");
  }
}

export async function verifyWebsiteOrder(id: string): Promise<WebsiteOrder> {
  if (!id) throw new Error("Order id is required");
  try {
    const response = await api.post<{ order: WebsiteOrder }>(
      `/website-orders/${id}/verify`,
      {},
    );
    return response.data.order;
  } catch (error) {
    handleApiError(error, "verify website order");
  }
}

export async function rejectWebsiteOrder(
  id: string,
  data: RejectOrderData,
): Promise<WebsiteOrder> {
  if (!id) throw new Error("Order id is required");
  try {
    const response = await api.post<{ order: WebsiteOrder }>(
      `/website-orders/${id}/reject`,
      data,
    );
    return response.data.order;
  } catch (error) {
    handleApiError(error, "reject website order");
  }
}

export async function convertWebsiteOrder(
  id: string,
  data: ConvertOrderData,
): Promise<WebsiteOrder> {
  if (!id) throw new Error("Order id is required");
  try {
    const response = await api.post<{ order: WebsiteOrder }>(
      `/website-orders/${id}/convert`,
      data,
    );
    return response.data.order;
  } catch (error) {
    handleApiError(error, "convert website order");
  }
}

export async function deleteWebsiteOrder(id: string): Promise<void> {
  if (!id) throw new Error("Order id is required");
  try {
    await api.delete(`/website-orders/${id}`);
  } catch (error) {
    handleApiError(error, "delete website order");
  }
}
