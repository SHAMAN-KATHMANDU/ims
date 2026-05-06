"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listBlockComments,
  createBlockComment,
  resolveBlockComment,
  reopenBlockComment,
  deleteBlockComment,
  type ListCommentsQuery,
  type CreateCommentInput,
  type CommentRecordType,
} from "../services/block-comments.service";

export const blockCommentsKeys = {
  all: ["block-comments"] as const,
  list: (query: ListCommentsQuery) =>
    [
      ...blockCommentsKeys.all,
      "list",
      query.recordType,
      query.recordId,
      query.blockId ?? null,
      query.hideResolved ?? false,
    ] as const,
};

interface BlockCommentsHookOptions {
  enabled?: boolean;
}

export function useBlockComments(
  query: ListCommentsQuery | null,
  options?: BlockCommentsHookOptions,
) {
  return useQuery({
    queryKey: query
      ? blockCommentsKeys.list(query)
      : [...blockCommentsKeys.all, "list", "_disabled"],
    queryFn: () => {
      if (!query) throw new Error("query is required");
      return listBlockComments(query);
    },
    enabled: !!query && (options?.enabled ?? true),
    retry: false,
  });
}

export function useCreateBlockComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) => createBlockComment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: blockCommentsKeys.all });
    },
  });
}

export function useResolveBlockComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resolveBlockComment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: blockCommentsKeys.all });
    },
  });
}

export function useReopenBlockComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reopenBlockComment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: blockCommentsKeys.all });
    },
  });
}

export function useDeleteBlockComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBlockComment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: blockCommentsKeys.all });
    },
  });
}

export type { CommentRecordType };
