import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";
import type { BlockNode } from "@repo/shared";

export interface Snippet {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  category: string | null;
  body: BlockNode[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSnippetData {
  slug: string;
  title: string;
  category?: string | null;
  body?: BlockNode[];
}

export interface UpdateSnippetData {
  slug?: string;
  title?: string;
  category?: string | null;
  body?: BlockNode[];
}

export interface SnippetListParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}

export interface SnippetListResponse {
  snippets: Snippet[];
  total: number;
  page: number;
  limit: number;
}

export const snippetsService = {
  async listSnippets(params?: SnippetListParams): Promise<SnippetListResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.category) queryParams.append("category", params.category);
      if (params?.search) queryParams.append("search", params.search);

      const { data } = await api.get<{
        message: string;
        snippets: Snippet[];
        total: number;
        page: number;
        limit: number;
      }>(`/snippets?${queryParams.toString()}`);

      return {
        snippets: data.snippets ?? [],
        total: data.total ?? 0,
        page: data.page ?? 1,
        limit: data.limit ?? 50,
      };
    } catch (error) {
      throw handleApiError(error, "snippets");
    }
  },

  async getSnippet(id: string): Promise<Snippet> {
    try {
      const { data } = await api.get<{
        message: string;
        snippet: Snippet;
      }>(`/snippets/${id}`);
      return data.snippet;
    } catch (error) {
      throw handleApiError(error, "snippets");
    }
  },

  async createSnippet(payload: CreateSnippetData): Promise<Snippet> {
    try {
      const { data } = await api.post<{
        message: string;
        snippet: Snippet;
      }>("/snippets", payload);
      return data.snippet;
    } catch (error) {
      throw handleApiError(error, "snippets");
    }
  },

  async updateSnippet(
    id: string,
    payload: UpdateSnippetData,
  ): Promise<Snippet> {
    try {
      const { data } = await api.patch<{
        message: string;
        snippet: Snippet;
      }>(`/snippets/${id}`, payload);
      return data.snippet;
    } catch (error) {
      throw handleApiError(error, "snippets");
    }
  },

  async deleteSnippet(id: string): Promise<void> {
    try {
      await api.delete(`/snippets/${id}`);
    } catch (error) {
      throw handleApiError(error, "snippets");
    }
  },
};
