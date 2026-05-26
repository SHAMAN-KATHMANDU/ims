"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMcpToken,
  listMcpTokens,
  revokeMcpToken,
} from "../services/mcp-tokens.service";
import type { CreateMcpTokenData } from "../types";

export const mcpTokenKeys = {
  all: ["mcp-tokens"] as const,
  lists: () => [...mcpTokenKeys.all, "list"] as const,
};

export function useMcpTokens(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: mcpTokenKeys.lists(),
    queryFn: () => listMcpTokens(),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateMcpToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMcpTokenData) => createMcpToken(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpTokenKeys.all });
    },
  });
}

export function useRevokeMcpToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeMcpToken(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpTokenKeys.all });
    },
  });
}
