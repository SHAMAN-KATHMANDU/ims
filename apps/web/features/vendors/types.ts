/**
 * Vendors feature types.
 */

import type { PaginationMeta } from "@/lib/apiTypes";

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
  _count?: { products: number };
  products?: VendorProduct[];
}

export interface VendorListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
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
