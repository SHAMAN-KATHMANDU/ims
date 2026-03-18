"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getConversations,
  getConversation,
  updateConversation,
  markConversationRead,
  type ConversationListParams,
  type UpdateConversationData,
} from "../services/messaging.service";

export const conversationKeys = {
  all: ["conversations"] as const,
  lists: () => [...conversationKeys.all, "list"] as const,
  list: (params: ConversationListParams) =>
    [...conversationKeys.lists(), params] as const,
  details: () => [...conversationKeys.all, "detail"] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
};

export function useConversations(params: ConversationListParams = {}) {
  return useQuery({
    queryKey: conversationKeys.list(params),
    queryFn: () => getConversations(params),
    placeholderData: (prev) => prev,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: conversationKeys.detail(id!),
    queryFn: () => getConversation(id!),
    enabled: !!id,
  });
}

export function useUpdateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConversationData }) =>
      updateConversation(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: conversationKeys.lists() });
      qc.invalidateQueries({ queryKey: conversationKeys.detail(id) });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      markConversationRead(conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}
