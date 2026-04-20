/**
 * Bundle Service
 *
 * Single source for bundle API calls. All bundle HTTP requests must go through this file.
 * Do not add React or UI logic.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import {
  type PaginationMeta,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/lib/apiTypes";
import type {
  Bundle,
  BundleListParams,
  CreateBundleData,
  PaginatedBundlesResponse,
  UpdateBundleData,
} from "../types";

interface BundlesApiResponse {
  message: string;
  data: Bundle[];
  pagination: PaginationMeta;
}

interface BundleResponse {
  message: string;
  bundle: Bundle;
}

export { DEFAULT_PAGE, DEFAULT_LIMIT };

export async function getBundles(
  params: BundleListParams = {},
): Promise<PaginatedBundlesResponse> {
  const {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
    search,
    active,
    sortBy,
    sortOrder,
  } = params;

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (search?.trim()) {
    queryParams.set("search", search.trim());
  }
  if (typeof active === "boolean") {
    queryParams.set("active", String(active));
  }
  if (sortBy) {
    queryParams.set("sortBy", sortBy);
  }
  if (sortOrder) {
    queryParams.set("sortOrder", sortOrder);
  }

  try {
    const response = await api.get<BundlesApiResponse>(
      `/bundles?${queryParams.toString()}`,
    );
    return {
      data: response.data.data || [],
      pagination: response.data.pagination,
    };
  } catch (error) {
    handleApiError(error, "fetch bundles");
  }
}

export async function getBundleById(id: string): Promise<Bundle> {
  if (!id?.trim()) {
    throw new Error("Bundle ID is required");
  }
  try {
    const response = await api.get<BundleResponse>(`/bundles/${id}`);
    return response.data.bundle;
  } catch (error) {
    handleApiError(error, `fetch bundle "${id}"`);
  }
}

export async function createBundle(data: CreateBundleData): Promise<Bundle> {
  try {
    const response = await api.post<BundleResponse>("/bundles", data);
    return response.data.bundle;
  } catch (error) {
    handleApiError(error, "create bundle");
  }
}

export async function updateBundle(
  id: string,
  data: UpdateBundleData,
): Promise<Bundle> {
  if (!id?.trim()) {
    throw new Error("Bundle ID is required");
  }
  try {
    const response = await api.patch<BundleResponse>(`/bundles/${id}`, data);
    return response.data.bundle;
  } catch (error) {
    handleApiError(error, `update bundle "${id}"`);
  }
}

export async function deleteBundle(id: string): Promise<void> {
  if (!id?.trim()) {
    throw new Error("Bundle ID is required");
  }
  try {
    await api.delete(`/bundles/${id}`);
  } catch (error) {
    handleApiError(error, `delete bundle "${id}"`);
  }
}
