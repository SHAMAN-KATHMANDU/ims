/**
 * Block-comments client service — Phase 6 inline review threads.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export type CommentRecordType = "BLOG_POST" | "TENANT_PAGE";

export interface BlockCommentRow {
  id: string;
  recordType: CommentRecordType;
  recordId: string;
  blockId: string | null;
  body: string;
  authorId: string;
  parentId: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListCommentsQuery {
  recordType: CommentRecordType;
  recordId: string;
  blockId?: string;
  hideResolved?: boolean;
}

export interface CreateCommentInput {
  recordType: CommentRecordType;
  recordId: string;
  blockId?: string | null;
  body: string;
  parentId?: string | null;
}

export async function listBlockComments(
  query: ListCommentsQuery,
): Promise<BlockCommentRow[]> {
  try {
    const response = await api.get<{ comments: BlockCommentRow[] }>(
      "/block-comments",
      { params: query },
    );
    return response.data.comments ?? [];
  } catch (error) {
    handleApiError(error, "list comments");
  }
}

export async function createBlockComment(
  input: CreateCommentInput,
): Promise<BlockCommentRow> {
  try {
    const response = await api.post<{ comment: BlockCommentRow }>(
      "/block-comments",
      input,
    );
    return response.data.comment;
  } catch (error) {
    handleApiError(error, "create comment");
  }
}

export async function resolveBlockComment(
  id: string,
): Promise<BlockCommentRow> {
  try {
    const response = await api.post<{ comment: BlockCommentRow }>(
      `/block-comments/${id}/resolve`,
    );
    return response.data.comment;
  } catch (error) {
    handleApiError(error, "resolve comment");
  }
}

export async function reopenBlockComment(id: string): Promise<BlockCommentRow> {
  try {
    const response = await api.post<{ comment: BlockCommentRow }>(
      `/block-comments/${id}/reopen`,
    );
    return response.data.comment;
  } catch (error) {
    handleApiError(error, "reopen comment");
  }
}

export async function deleteBlockComment(id: string): Promise<void> {
  try {
    await api.delete(`/block-comments/${id}`);
  } catch (error) {
    handleApiError(error, "delete comment");
  }
}
