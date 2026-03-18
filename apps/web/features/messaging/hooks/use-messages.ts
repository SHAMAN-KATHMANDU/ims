"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getMessages,
  sendMessage,
  type SendMessageData,
} from "../services/messaging.service";
import { conversationKeys } from "./use-conversations";

export const messageKeys = {
  all: ["messages"] as const,
  lists: () => [...messageKeys.all, "list"] as const,
  list: (conversationId: string) =>
    [...messageKeys.lists(), conversationId] as const,
};

export function useMessages(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: messageKeys.list(conversationId!),
    queryFn: ({ pageParam }) =>
      getMessages(conversationId!, { cursor: pageParam, limit: 50 }).then(
        (r) => r.messages,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < 50) return undefined;
      return lastPage[lastPage.length - 1]?.id;
    },
    enabled: !!conversationId,
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SendMessageData) => sendMessage(conversationId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messageKeys.list(conversationId) });
      qc.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}
