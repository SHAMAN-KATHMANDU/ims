"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@repo/shared";
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

export function useConversations(
  params: ConversationListParams = {},
  options?: { enabled?: boolean },
) {
  const messagingEnabled = useEnvFeatureFlag(EnvFeature.MESSAGING);
  return useQuery({
    queryKey: conversationKeys.list(params),
    queryFn: () => getConversations(params),
    placeholderData: (prev) => prev,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    enabled: messagingEnabled && (options?.enabled ?? true),
  });
}

export function useConversation(
  id: string | null,
  options?: { enabled?: boolean },
) {
  const messagingEnabled = useEnvFeatureFlag(EnvFeature.MESSAGING);
  return useQuery({
    queryKey: conversationKeys.detail(id!),
    queryFn: () => getConversation(id!),
    enabled: messagingEnabled && !!id && (options?.enabled ?? true),
  });
}

export function useUpdateConversation() {
  const messagingEnabled = useEnvFeatureFlag(EnvFeature.MESSAGING);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateConversationData;
    }) => {
      if (!messagingEnabled) throw new Error("Feature disabled: MESSAGING");
      return updateConversation(id, data);
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: conversationKeys.lists() });
      qc.invalidateQueries({ queryKey: conversationKeys.detail(id) });
    },
  });
}

export function useMarkRead() {
  const messagingEnabled = useEnvFeatureFlag(EnvFeature.MESSAGING);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => {
      if (!messagingEnabled) throw new Error("Feature disabled: MESSAGING");
      return markConversationRead(conversationId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}
