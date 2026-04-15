/**
 * Site Layouts Service — tenant-scoped /site-layouts/* endpoints.
 *
 * Mirrors the apps/api site-layouts module. The wire types for BlockNode
 * come from @repo/shared so the editor and renderer agree on the schema
 * without any duplication.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { BlockNode, SiteLayoutScope } from "@repo/shared";

export type { BlockNode, SiteLayoutScope } from "@repo/shared";

export interface SiteLayoutRow {
  id: string;
  tenantId: string;
  scope: SiteLayoutScope | string;
  pageId: string | null;
  blocks: unknown;
  draftBlocks: unknown | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export async function listSiteLayouts(): Promise<SiteLayoutRow[]> {
  try {
    const response = await api.get<{ layouts: SiteLayoutRow[] }>(
      "/site-layouts",
    );
    return response.data.layouts ?? [];
  } catch (error) {
    handleApiError(error, "fetch site layouts");
  }
}

export async function getSiteLayout(
  scope: SiteLayoutScope,
  pageId?: string,
): Promise<SiteLayoutRow | null> {
  try {
    const suffix = pageId ? `?pageId=${encodeURIComponent(pageId)}` : "";
    const response = await api.get<{ layout: SiteLayoutRow }>(
      `/site-layouts/${encodeURIComponent(scope)}${suffix}`,
    );
    return response.data.layout;
  } catch (error) {
    // 404 = no layout yet, return null so the editor shows an empty tree.
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      (error as { response?: { status?: number } }).response?.status === 404
    ) {
      return null;
    }
    handleApiError(error, "fetch site layout");
  }
}

export async function upsertSiteLayoutDraft(input: {
  scope: SiteLayoutScope;
  pageId?: string | null;
  blocks: BlockNode[];
}): Promise<SiteLayoutRow> {
  try {
    const response = await api.put<{ layout: SiteLayoutRow }>(
      "/site-layouts",
      input,
    );
    return response.data.layout;
  } catch (error) {
    handleApiError(error, "save site layout draft");
  }
}

export async function publishSiteLayout(
  scope: SiteLayoutScope,
  pageId?: string,
): Promise<SiteLayoutRow> {
  try {
    const suffix = pageId ? `?pageId=${encodeURIComponent(pageId)}` : "";
    const response = await api.post<{ layout: SiteLayoutRow }>(
      `/site-layouts/${encodeURIComponent(scope)}/publish${suffix}`,
      {},
    );
    return response.data.layout;
  } catch (error) {
    handleApiError(error, "publish site layout");
  }
}

export async function deleteSiteLayout(
  scope: SiteLayoutScope,
  pageId?: string,
): Promise<void> {
  try {
    const suffix = pageId ? `?pageId=${encodeURIComponent(pageId)}` : "";
    await api.delete(`/site-layouts/${encodeURIComponent(scope)}${suffix}`);
  } catch (error) {
    handleApiError(error, "delete site layout");
  }
}

export async function getSiteLayoutPreviewUrl(
  scope: SiteLayoutScope,
  pageId?: string,
): Promise<string> {
  try {
    const suffix = pageId ? `?pageId=${encodeURIComponent(pageId)}` : "";
    const response = await api.get<{ url: string }>(
      `/site-layouts/${encodeURIComponent(scope)}/preview-url${suffix}`,
    );
    return response.data.url;
  } catch (error) {
    handleApiError(error, "mint site layout preview URL");
  }
}
