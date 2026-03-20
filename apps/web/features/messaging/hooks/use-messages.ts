"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getMessages,
  sendMessage,
  uploadMessagingMedia,
  addMessageReaction,
  removeMessageReaction,
  editConversationMessage,
  type Message,
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
    onSuccess: (res) => {
      const newMsg = res.data;
      qc.setQueryData<InfiniteData<Message[]>>(
        messageKeys.list(conversationId),
        (old) => {
          if (!old?.pages?.length) return old;
          const exists = old.pages.some((page) =>
            page.some((m) => m.id === newMsg.id),
          );
          if (exists) return old;
          const pages = old.pages.map((page, i) =>
            i === 0 ? [newMsg, ...page] : page,
          );
          return { ...old, pages };
        },
      );
      void qc.invalidateQueries({ queryKey: messageKeys.list(conversationId) });
      void qc.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}

export function useUploadMessagingMedia(conversationId: string) {
  return useMutation({
    mutationFn: (args: {
      file: File;
      onProgress?: (percent: number) => void;
    }) =>
      uploadMessagingMedia(conversationId, args.file, args.onProgress),
  });
}

export function useAddMessageReaction(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
    }) => addMessageReaction(conversationId, messageId, emoji),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messageKeys.list(conversationId) });
    },
    onError: (e: Error) => {
      toast.error(e.message ?? "Could not add reaction");
    },
  });
}

export function useRemoveMessageReaction(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
    }) => removeMessageReaction(conversationId, messageId, emoji),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messageKeys.list(conversationId) });
    },
    onError: (e: Error) => {
      toast.error(e.message ?? "Could not remove reaction");
    },
  });
}

export function useEditConversationMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      messageId,
      text,
    }: {
      messageId: string;
      text: string;
    }) => editConversationMessage(conversationId, messageId, text),
    onSuccess: (updated) => {
      qc.setQueryData<InfiniteData<Message[]>>(
        messageKeys.list(conversationId),
        (old) => {
          if (!old?.pages?.length) return old;
          const pages = old.pages.map((page) =>
            page.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
          );
          return { ...old, pages };
        },
      );
      void qc.invalidateQueries({ queryKey: messageKeys.list(conversationId) });
    },
    onError: (e: Error) => {
      toast.error(e.message ?? "Could not edit message");
    },
  });
}
