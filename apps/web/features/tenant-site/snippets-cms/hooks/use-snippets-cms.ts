"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as snippetsService from "../services/snippets-cms.service";

const snippetKeys = {
  all: ["snippets-cms"] as const,
  list: (params?: unknown) => [...snippetKeys.all, "list", params] as const,
  detail: (id: string) => [...snippetKeys.all, "detail", id] as const,
};

export function useSnippetsList(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: snippetKeys.list(params),
    queryFn: () => snippetsService.listSnippets(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSnippet(id: string) {
  return useQuery({
    queryKey: snippetKeys.detail(id),
    queryFn: () => snippetsService.getSnippet(id),
    enabled: !!id,
  });
}

export function useCreateSnippet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: snippetsService.createSnippet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snippetKeys.all });
    },
  });
}

export function useUpdateSnippet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: snippetsService.UpdateSnippetData;
    }) => snippetsService.updateSnippet(id, data),
    onSuccess: (snippet) => {
      queryClient.invalidateQueries({ queryKey: snippetKeys.all });
      queryClient.setQueryData(snippetKeys.detail(snippet.id), snippet);
    },
  });
}

export function useDeleteSnippet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: snippetsService.deleteSnippet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snippetKeys.all });
    },
  });
}
