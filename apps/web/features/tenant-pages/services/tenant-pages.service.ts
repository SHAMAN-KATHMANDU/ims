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
  /** Phase 6: review state, independent of `isPublished`. Defaults to DRAFT for legacy rows. */
  reviewStatus?: ContentReviewStatus;
  /** Phase 8 — Notion-style cover image. */
  coverImageUrl?: string | null;
  /** Phase 8 — emoji or short string. */
  icon?: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantPage extends TenantPageListItem {
  bodyMarkdown: string;
  /** Block tree body (Phase 2). Empty array on legacy / freshly-migrated pages. */
  body?: BlockNodeJson[];
  /** Phase 4: ISO-8601 timestamp of a scheduled auto-publish; null = none. */
  scheduledPublishAt?: string | null;
}

/** See blog service for the rationale on this loose JSON type. */
export type BlockNodeJson = {
  id: string;
  kind: string;
  props: unknown;
  children?: BlockNodeJson[];
};

export interface CreateTenantPageData {
  slug: string;
  title: string;
  /** Either bodyMarkdown or body must be set; API derives the other. */
  bodyMarkdown?: string;
  body?: BlockNodeJson[];
  /** Phase 4: ISO-8601 timestamp; the worker auto-publishes drafts at this time. */
  scheduledPublishAt?: string | null;
  /** Phase 8 — Notion-style cover image. */
  coverImageUrl?: string | null;
  /** Phase 8 — emoji or short string. */
  icon?: string | null;
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

// ============================================
// API — Versions (Phase 4)
// ============================================

export interface TenantPageVersionListItem {
  id: string;
  createdAt: string;
  editorId: string | null;
  note: string | null;
}

export async function listTenantPageVersions(
  id: string,
): Promise<TenantPageVersionListItem[]> {
  if (!id) throw new Error("Page id is required");
  try {
    const response = await api.get<{ versions: TenantPageVersionListItem[] }>(
      `/pages/${id}/versions`,
    );
    return response.data.versions ?? [];
  } catch (error) {
    handleApiError(error, "list tenant page versions");
  }
}

export async function restoreTenantPageVersion(
  id: string,
  versionId: string,
): Promise<TenantPage> {
  if (!id || !versionId) throw new Error("Page id and version id are required");
  try {
    const response = await api.post<{ page: TenantPage }>(
      `/pages/${id}/versions/${versionId}/restore`,
    );
    return response.data.page;
  } catch (error) {
    handleApiError(error, "restore tenant page version");
  }
}

export async function getTenantPagePreviewUrl(id: string): Promise<string> {
  if (!id) throw new Error("Page id is required");
  try {
    const response = await api.get<{ url: string }>(`/pages/${id}/preview-url`);
    return response.data.url;
  } catch (error) {
    handleApiError(error, "get page preview url");
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

export type ConvertToBlocksMode = "convert" | "fresh";

export interface ConvertToBlocksResponse {
  layoutId: string;
  blocks: unknown[];
}

/**
 * Convert a markdown TenantPage into a block-based layout. Returns 409 if
 * a block layout already exists for this page (callers should navigate to
 * the editor instead of trying to recreate).
 */
export async function convertPageToBlocks(
  id: string,
  mode: ConvertToBlocksMode,
): Promise<ConvertToBlocksResponse> {
  if (!id) throw new Error("Page id is required");
  try {
    const response = await api.post<{
      layoutId: string;
      blocks: unknown[];
    }>(`/pages/${id}/convert-to-blocks`, { mode });
    return { layoutId: response.data.layoutId, blocks: response.data.blocks };
  } catch (error) {
    handleApiError(error, "convert page to blocks");
  }
}

export async function duplicateTenantPage(id: string): Promise<TenantPage> {
  if (!id) throw new Error("Page id is required");
  try {
    const response = await api.post<{ page: TenantPage }>(
      `/pages/${id}/duplicate`,
      {},
    );
    return response.data.page;
  } catch (error) {
    handleApiError(error, "duplicate tenant page");
  }
}

// ============================================
// API — Review workflow (Phase 6, behind CMS_REVIEW_WORKFLOW)
// ============================================

export type ContentReviewStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "PUBLISHED";

export async function requestPageReview(
  id: string,
): Promise<{ id: string; reviewStatus: ContentReviewStatus }> {
  if (!id) throw new Error("Page id is required");
  try {
    const response = await api.post<{
      id: string;
      reviewStatus: ContentReviewStatus;
    }>(`/pages/${id}/review/request`);
    return response.data;
  } catch (error) {
    handleApiError(error, "request page review");
  }
}

export async function approvePageReview(
  id: string,
): Promise<{ id: string; reviewStatus: ContentReviewStatus }> {
  if (!id) throw new Error("Page id is required");
  try {
    const response = await api.post<{
      id: string;
      reviewStatus: ContentReviewStatus;
    }>(`/pages/${id}/review/approve`);
    return response.data;
  } catch (error) {
    handleApiError(error, "approve tenant page");
  }
}

export async function rejectPageReview(
  id: string,
): Promise<{ id: string; reviewStatus: ContentReviewStatus }> {
  if (!id) throw new Error("Page id is required");
  try {
    const response = await api.post<{
      id: string;
      reviewStatus: ContentReviewStatus;
    }>(`/pages/${id}/review/reject`);
    return response.data;
  } catch (error) {
    handleApiError(error, "reject tenant page");
  }
}
