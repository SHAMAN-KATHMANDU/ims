/**
 * Tenants feature types.
 */

import type { PaginationMeta } from "@/lib/apiTypes";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedTenantsResponse {
  data: Tenant[];
  pagination: PaginationMeta;
}

export interface CreateTenantData {
  name: string;
  slug: string;
}
