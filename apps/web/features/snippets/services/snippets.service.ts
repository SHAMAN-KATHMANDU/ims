/**
 * Snippets API service — Phase 5.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export interface SnippetListItem {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Loose JSON BlockNode shape — see tenant-blog service for rationale. */
export type BlockNodeJson = {
  id: string;
  kind: string;
  props: unknown;
  children?: BlockNodeJson[];
};

export interface Snippet extends SnippetListItem {
  body: BlockNodeJson[];
}

export interface ListSnippetsQuery {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}

export interface SnippetList {
  snippets: SnippetListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateSnippetData {
  slug: string;
  title: string;
  category?: string | null;
  body: BlockNodeJson[];
}

export type UpdateSnippetData = Partial<CreateSnippetData>;

export async function listSnippets(
  query: ListSnippetsQuery = {},
): Promise<SnippetList> {
  try {
    const response = await api.get<SnippetList>("/snippets", { params: query });
    return response.data;
  } catch (error) {
    handleApiError(error, "list snippets");
  }
}

export async function getSnippet(id: string): Promise<Snippet> {
  if (!id) throw new Error("Snippet id is required");
  try {
    const response = await api.get<{ snippet: Snippet }>(`/snippets/${id}`);
    return response.data.snippet;
  } catch (error) {
    handleApiError(error, "get snippet");
  }
}

export async function createSnippet(data: CreateSnippetData): Promise<Snippet> {
  try {
    const response = await api.post<{ snippet: Snippet }>("/snippets", data);
    return response.data.snippet;
  } catch (error) {
    handleApiError(error, "create snippet");
  }
}

export async function updateSnippet(
  id: string,
  data: UpdateSnippetData,
): Promise<Snippet> {
  if (!id) throw new Error("Snippet id is required");
  try {
    const response = await api.patch<{ snippet: Snippet }>(
      `/snippets/${id}`,
      data,
    );
    return response.data.snippet;
  } catch (error) {
    handleApiError(error, "update snippet");
  }
}

export async function deleteSnippet(id: string): Promise<void> {
  if (!id) throw new Error("Snippet id is required");
  try {
    await api.delete(`/snippets/${id}`);
  } catch (error) {
    handleApiError(error, "delete snippet");
  }
}
