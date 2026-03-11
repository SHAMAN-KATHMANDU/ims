/**
 * Locations feature types.
 */

import type { PaginationMeta } from "@/lib/apiTypes";

export type LocationType = "WAREHOUSE" | "SHOWROOM";

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  address?: string;
  isActive: boolean;
  isDefaultWarehouse?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    inventory: number;
    transfersFrom: number;
    transfersTo: number;
  };
}

export type LocationStatusFilter = "all" | "active" | "inactive";

export interface LocationListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: LocationType;
  /** @deprecated Use status instead */
  activeOnly?: boolean;
  status?: LocationStatusFilter;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedLocationsResponse {
  data: Location[];
  pagination: PaginationMeta;
}

export interface CreateLocationData {
  name: string;
  type?: LocationType;
  address?: string;
  isDefaultWarehouse?: boolean;
}

export interface UpdateLocationData {
  name?: string;
  type?: LocationType;
  address?: string;
  isActive?: boolean;
  isDefaultWarehouse?: boolean;
}

export interface LocationFormValues {
  name: string;
  type: LocationType;
  address: string;
  isDefaultWarehouse?: boolean;
}
