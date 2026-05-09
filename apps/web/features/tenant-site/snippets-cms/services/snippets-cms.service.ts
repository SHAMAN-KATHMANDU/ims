/**
 * Snippets CMS service — reusable content blocks for tenant sites.
 * Phase 5: BlockNode[] trees stored as snippets.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export interface BlockNodeJson {
  id: string;
  kind: string;
  props: unknown;
  children?: BlockNodeJson[];
}

export interface SnippetItem {
  id: string;
  slug: string;
  name: string;
  type: "html" | "block";
  content: BlockNodeJson[] | string;
  uses: number;
  updatedAt: string;
  createdAt: string;
}

export interface SnippetDetail extends SnippetItem {
  description?: string;
}

export interface CreateSnippetData {
  slug: string;
  name: string;
  type: "html" | "block";
  content: BlockNodeJson[] | string;
  description?: string;
}

export interface UpdateSnippetData extends Partial<CreateSnippetData> {}

export interface SnippetListResponse {
  snippets: SnippetItem[];
  total: number;
  page: number;
  limit: number;
}

export async function listSnippets(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<SnippetListResponse> {
  try {
    const response = await api.get<SnippetListResponse>("/snippets", {
      params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "list snippets");
  }
}

export async function getSnippet(id: string): Promise<SnippetDetail> {
  try {
    const response = await api.get<{ snippet: SnippetDetail }>(
      `/snippets/${id}`,
    );
    return response.data.snippet;
  } catch (error) {
    handleApiError(error, "get snippet");
  }
}

export async function createSnippet(
  data: CreateSnippetData,
): Promise<SnippetDetail> {
  try {
    const response = await api.post<{ snippet: SnippetDetail }>(
      "/snippets",
      data,
    );
    return response.data.snippet;
  } catch (error) {
    handleApiError(error, "create snippet");
  }
}

export async function updateSnippet(
  id: string,
  data: UpdateSnippetData,
): Promise<SnippetDetail> {
  try {
    const response = await api.patch<{ snippet: SnippetDetail }>(
      `/snippets/${id}`,
      data,
    );
    return response.data.snippet;
  } catch (error) {
    handleApiError(error, "update snippet");
  }
}

export async function deleteSnippet(id: string): Promise<void> {
  try {
    await api.delete(`/snippets/${id}`);
  } catch (error) {
    handleApiError(error, "delete snippet");
  }
}
