"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import {
  snippetsService,
  type CreateSnippetData,
  type UpdateSnippetData,
  type SnippetListParams,
} from "../services/snippets.service";

export type {
  Snippet,
  SnippetListResponse,
} from "../services/snippets.service";

export const snippetKeys = {
  all: ["snippets"] as const,
  lists: () => [...snippetKeys.all, "list"] as const,
  list: (params: SnippetListParams) =>
    [...snippetKeys.lists(), params] as const,
  details: () => [...snippetKeys.all, "detail"] as const,
  detail: (id: string) => [...snippetKeys.details(), id] as const,
};

export function useSnippetsQuery(params?: SnippetListParams) {
  return useQuery({
    queryKey: snippetKeys.list(params ?? {}),
    queryFn: () => snippetsService.listSnippets(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSnippetQuery(id: string) {
  return useQuery({
    queryKey: snippetKeys.detail(id),
    queryFn: () => snippetsService.getSnippet(id),
    enabled: !!id,
  });
}

export function useCreateSnippet() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (payload: CreateSnippetData) =>
      snippetsService.createSnippet(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: snippetKeys.lists() });
      toast({ title: "Snippet created" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create snippet",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateSnippet() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSnippetData }) =>
      snippetsService.updateSnippet(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: snippetKeys.lists() });
      qc.invalidateQueries({ queryKey: snippetKeys.detail(id) });
      toast({ title: "Snippet updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update snippet",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteSnippet() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => snippetsService.deleteSnippet(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: snippetKeys.lists() });
      toast({ title: "Snippet deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete snippet",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
