/**
 * Tenant Pages Service — tenant-scoped endpoints under /pages/*.
 * Available to admin / superAdmin after the platform has enabled the
 * website feature.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

// ============================================
// Types
// ============================================

export type TenantPageLayoutVariant = "default" | "full-width" | "narrow";

export interface TenantPageListItem {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  layoutVariant: TenantPageLayoutVariant;
  showInNav: boolean;
  navOrder: number;
  isPublished: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantPage extends TenantPageListItem {
  bodyMarkdown: string;
}

export interface CreateTenantPageData {
  slug: string;
  title: string;
  bodyMarkdown: string;
  layoutVariant?: TenantPageLayoutVariant;
  showInNav?: boolean;
  navOrder?: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export type UpdateTenantPageData = Partial<CreateTenantPageData>;

export interface ListTenantPagesQuery {
  page?: number;
  limit?: number;
  published?: boolean;
}

export interface TenantPageList {
  pages: TenantPageListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ReorderPagesInput {
  order: { id: string; navOrder: number }[];
}

// ============================================
// API
// ============================================

export async function listTenantPages(
  query: ListTenantPagesQuery = {},
): Promise<TenantPageList> {
  try {
    const response = await api.get<TenantPageList>("/pages", { params: query });
    return response.data;
  } catch (error) {
    handleApiError(error, "list tenant pages");
  }
}

export async function getTenantPage(id: string): Promise<TenantPage> {
  if (!id) throw new Error("Page id is required");
  try {
    const response = await api.get<{ page: TenantPage }>(`/pages/${id}`);
    return response.data.page;
  } catch (error) {
    handleApiError(error, "fetch tenant page");
  }
}

export async function createTenantPage(
  data: CreateTenantPageData,
): Promise<TenantPage> {
  try {
    const response = await api.post<{ page: TenantPage }>("/pages", data);
    return response.data.page;
  } catch (error) {
    handleApiError(error, "create tenant page");
  }
}

export async function updateTenantPage(
  id: string,
  data: UpdateTenantPageData,
): Promise<TenantPage> {
  if (!id) throw new Error("Page id is required");
  try {
    const response = await api.patch<{ page: TenantPage }>(
      `/pages/${id}`,
      data,
    );
    return response.data.page;
  } catch (error) {
    handleApiError(error, "update tenant page");
  }
}

export async function publishTenantPage(id: string): Promise<TenantPage> {
  if (!id) throw new Error("Page id is required");
  try {
    const response = await api.post<{ page: TenantPage }>(
      `/pages/${id}/publish`,
      {},
    );
    return response.data.page;
  } catch (error) {
    handleApiError(error, "publish tenant page");
  }
}

export async function unpublishTenantPage(id: string): Promise<TenantPage> {
  if (!id) throw new Error("Page id is required");
  try {
    const response = await api.post<{ page: TenantPage }>(
      `/pages/${id}/unpublish`,
      {},
    );
    return response.data.page;
  } catch (error) {
    handleApiError(error, "unpublish tenant page");
  }
}

export async function deleteTenantPage(id: string): Promise<void> {
  if (!id) throw new Error("Page id is required");
  try {
    await api.delete(`/pages/${id}`);
  } catch (error) {
    handleApiError(error, "delete tenant page");
  }
}

export async function reorderTenantPages(
  input: ReorderPagesInput,
): Promise<void> {
  try {
    await api.post("/pages/reorder", input);
  } catch (error) {
    handleApiError(error, "reorder tenant pages");
  }
}
