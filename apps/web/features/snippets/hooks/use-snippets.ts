"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listSnippets,
  getSnippet,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  type ListSnippetsQuery,
  type CreateSnippetData,
  type UpdateSnippetData,
} from "../services/snippets.service";

export const snippetsKeys = {
  all: ["snippets"] as const,
  list: (query?: ListSnippetsQuery) =>
    [...snippetsKeys.all, "list", query ?? {}] as const,
  one: (id: string) => [...snippetsKeys.all, "one", id] as const,
};

export function useSnippets(query: ListSnippetsQuery = {}) {
  return useQuery({
    queryKey: snippetsKeys.list(query),
    queryFn: () => listSnippets(query),
    retry: false,
  });
}

export function useSnippet(id: string | null) {
  return useQuery({
    queryKey: snippetsKeys.one(id ?? ""),
    queryFn: () => {
      if (!id) throw new Error("Snippet id is required");
      return getSnippet(id);
    },
    enabled: !!id,
    retry: false,
  });
}

export function useCreateSnippet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSnippetData) => createSnippet(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: snippetsKeys.all });
    },
  });
}

export function useUpdateSnippet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSnippetData }) =>
      updateSnippet(id, data),
    onSuccess: (snippet) => {
      qc.invalidateQueries({ queryKey: snippetsKeys.all });
      qc.setQueryData(snippetsKeys.one(snippet.id), snippet);
    },
  });
}

export function useDeleteSnippet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSnippet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: snippetsKeys.all });
    },
  });
}
