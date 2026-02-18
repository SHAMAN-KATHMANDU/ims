/**
 * Vendor Service
 *
 * Single source for vendor API calls. All vendor HTTP requests must go through this file.
 * Do not add React or UI logic.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";
import {
  type PaginationMeta,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/lib/apiTypes";

export interface VendorProduct {
  id: string;
  imsCode: string;
  name: string;
  mrp?: number;
  costPrice?: number;
}

export interface Vendor {
  id: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
  products?: VendorProduct[];
}

export interface VendorListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface VendorProductsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedVendorProductsResponse {
  data: VendorProduct[];
  pagination: PaginationMeta;
}

export interface PaginatedVendorsResponse {
  data: Vendor[];
  pagination: PaginationMeta;
}

export interface CreateOrUpdateVendorData {
  name: string;
  contact?: string | null;
  phone?: string | null;
  address?: string | null;
}

interface VendorsApiResponse {
  message: string;
  data: Vendor[];
  pagination: PaginationMeta;
}

interface VendorResponse {
  message: string;
  vendor: Vendor;
}

export { DEFAULT_PAGE, DEFAULT_LIMIT };

export async function getVendors(
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

  try {
    const response = await api.get<VendorsApiResponse>(
      `/vendors?${queryParams.toString()}`,
    );
    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch vendors");
  }
}

export async function getVendorById(id: string): Promise<Vendor> {
  if (!id?.trim()) {
    throw new Error("Vendor ID is required");
  }
  try {
    const response = await api.get<VendorResponse>(`/vendors/${id}`);
    return response.data.vendor;
  } catch (error) {
    handleApiError(error, `fetch vendor "${id}"`);
  }
}

interface VendorProductsApiResponse {
  message: string;
  data: VendorProduct[];
  pagination: PaginationMeta;
}

export async function getVendorProducts(
  vendorId: string,
  params: VendorProductsParams = {},
): Promise<PaginatedVendorProductsResponse> {
  if (!vendorId?.trim()) {
    throw new Error("Vendor ID is required");
  }
  const { page = DEFAULT_PAGE, limit = 10, search } = params;
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search?.trim()) {
    queryParams.set("search", search.trim());
  }
  try {
    const response = await api.get<VendorProductsApiResponse>(
      `/vendors/${vendorId}/products?${queryParams.toString()}`,
    );
    return {
      data: response.data.data ?? [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, `fetch products for vendor "${vendorId}"`);
  }
}

export async function createVendor(
  data: CreateOrUpdateVendorData,
): Promise<Vendor> {
  if (!data.name?.trim()) {
    throw new Error("Vendor name is required");
  }

  try {
    const response = await api.post<VendorResponse>("/vendors", data);
    return response.data.vendor;
  } catch (error) {
    handleApiError(error, "create vendor");
  }
}

export async function updateVendor(
  id: string,
  data: Partial<CreateOrUpdateVendorData>,
): Promise<Vendor> {
  if (!id?.trim()) {
    throw new Error("Vendor ID is required");
  }

  try {
    const response = await api.put<VendorResponse>(`/vendors/${id}`, data);
    return response.data.vendor;
  } catch (error) {
    handleApiError(error, `update vendor "${id}"`);
  }
}

export async function deleteVendor(id: string): Promise<void> {
  if (!id?.trim()) {
    throw new Error("Vendor ID is required");
  }

  try {
    await api.delete(`/vendors/${id}`);
  } catch (error) {
    handleApiError(error, `delete vendor "${id}"`);
  }
}
