import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { BlockNode } from "@repo/shared";

export interface TenantPage {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  bodyMarkdown: string;
  body: BlockNode[];
  isPublished: boolean;
  scheduledPublishAt: string | null;
  layoutVariant: string;
  showInNav: boolean;
  navOrder: number;
  coverImageUrl: string | null;
  icon: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  kind: "page" | "scope";
  scope: string | null;
  isBuiltInScope: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePageData {
  slug: string;
  title: string;
  bodyMarkdown?: string;
  body?: BlockNode[];
  scheduledPublishAt?: string | null;
  layoutVariant?: string;
  showInNav?: boolean;
  navOrder?: number;
  coverImageUrl?: string | null;
  icon?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface UpdatePageData {
  slug?: string;
  title?: string;
  bodyMarkdown?: string;
  body?: BlockNode[];
  scheduledPublishAt?: string | null;
  layoutVariant?: string;
  showInNav?: boolean;
  navOrder?: number;
  coverImageUrl?: string | null;
  icon?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface PageListParams {
  page?: number;
  limit?: number;
  published?: boolean;
}

export interface PageListResponse {
  pages: TenantPage[];
  total: number;
  page: number;
  limit: number;
}

export interface PageVersion {
  id: string;
  resourceId: string;
  snapshot: Record<string, unknown>;
  editorId: string | null;
  note: string | null;
  createdAt: string;
}

export const pagesService = {
  async listPages(params?: PageListParams): Promise<PageListResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.published !== undefined)
        queryParams.append("published", params.published.toString());

      const { data } = await api.get<{
        message: string;
        pages: TenantPage[];
        total: number;
        page: number;
        limit: number;
      }>(`/pages?${queryParams.toString()}`);

      return {
        pages: data.pages ?? [],
        total: data.total ?? 0,
        page: data.page ?? 1,
        limit: data.limit ?? 50,
      };
    } catch (error) {
      throw handleApiError(error, "pages");
    }
  },

  async getPage(id: string): Promise<TenantPage> {
    try {
      const { data } = await api.get<{ message: string; page: TenantPage }>(
        `/pages/${id}`,
      );
      return data.page;
    } catch (error) {
      throw handleApiError(error, "pages");
    }
  },

  async createPage(payload: CreatePageData): Promise<TenantPage> {
    try {
      const { data } = await api.post<{ message: string; page: TenantPage }>(
        "/pages",
        payload,
      );
      return data.page;
    } catch (error) {
      throw handleApiError(error, "pages");
    }
  },

  async updatePage(id: string, payload: UpdatePageData): Promise<TenantPage> {
    try {
      const { data } = await api.patch<{ message: string; page: TenantPage }>(
        `/pages/${id}`,
        payload,
      );
      return data.page;
    } catch (error) {
      throw handleApiError(error, "pages");
    }
  },

  async deletePage(id: string): Promise<void> {
    try {
      await api.delete(`/pages/${id}`);
    } catch (error) {
      throw handleApiError(error, "pages");
    }
  },

  async publishPage(id: string): Promise<TenantPage> {
    try {
      const { data } = await api.post<{ message: string; page: TenantPage }>(
        `/pages/${id}/publish`,
        {},
      );
      return data.page;
    } catch (error) {
      throw handleApiError(error, "pages");
    }
  },

  async unpublishPage(id: string): Promise<TenantPage> {
    try {
      const { data } = await api.post<{ message: string; page: TenantPage }>(
        `/pages/${id}/unpublish`,
        {},
      );
      return data.page;
    } catch (error) {
      throw handleApiError(error, "pages");
    }
  },

  async duplicatePage(id: string): Promise<TenantPage> {
    try {
      const { data } = await api.post<{ message: string; page: TenantPage }>(
        `/pages/${id}/duplicate`,
        {},
      );
      return data.page;
    } catch (error) {
      throw handleApiError(error, "pages");
    }
  },

  async listVersions(id: string): Promise<PageVersion[]> {
    try {
      const { data } = await api.get<{
        message: string;
        versions: PageVersion[];
      }>(`/pages/${id}/versions`);
      return data.versions ?? [];
    } catch (error) {
      throw handleApiError(error, "pages");
    }
  },

  async restoreVersion(id: string, versionId: string): Promise<TenantPage> {
    try {
      const { data } = await api.post<{ message: string; page: TenantPage }>(
        `/pages/${id}/versions/${versionId}/restore`,
        {},
      );
      return data.page;
    } catch (error) {
      throw handleApiError(error, "pages");
    }
  },

  async convertToBlocks(
    id: string,
    mode?: "convert" | "fresh",
  ): Promise<{ layoutId: string }> {
    try {
      const { data } = await api.post<{
        message: string;
        layoutId: string;
      }>(`/pages/${id}/convert-to-blocks`, { mode: mode ?? "convert" });
      return { layoutId: data.layoutId };
    } catch (error) {
      throw handleApiError(error, "pages");
    }
  },

  async getPreviewUrl(id: string): Promise<{ url: string }> {
    try {
      const { data } = await api.get<{
        message: string;
        url: string;
      }>(`/pages/${id}/preview-url`);
      return { url: data.url };
    } catch (error) {
      throw handleApiError(error, "pages");
    }
  },
};
