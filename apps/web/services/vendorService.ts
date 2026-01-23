import api from "@/lib/axios";
import { handleApiError } from "@/lib/apiError";

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
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
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

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;

export async function getVendors(
  params: VendorListParams = {},
): Promise<PaginatedVendorsResponse> {
  const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, search } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search?.trim()) {
    queryParams.set("search", search.trim());
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
