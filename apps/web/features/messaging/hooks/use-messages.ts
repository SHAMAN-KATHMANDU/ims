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
  addMessageReaction,
  removeMessageReaction,
  editConversationMessage,
  type Message,
  type SendMessageData,
} from "../services/messaging.service";
import { conversationKeys } from "./use-conversations";
import { useAuthStore } from "@/store/auth-store";

function mapMessagePagesInCache(
  old: InfiniteData<Message[]> | undefined,
  messageId: string,
  updater: (m: Message) => Message,
): InfiniteData<Message[]> | undefined {
  if (!old?.pages?.length) return old;
  let found = false;
  const pages = old.pages.map((page) =>
    page.map((m) => {
      if (m.id !== messageId) return m;
      found = true;
      return updater(m);
    }),
  );
  if (!found) return old;
  return { ...old, pages };
}

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

export function useAddMessageReaction(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      addMessageReaction(conversationId, messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      await qc.cancelQueries({ queryKey: messageKeys.list(conversationId) });
      const previous = qc.getQueryData<InfiniteData<Message[]>>(
        messageKeys.list(conversationId),
      );
      const user = useAuthStore.getState().user;
      if (!user) {
        return { previous };
      }
      qc.setQueryData<InfiniteData<Message[]>>(
        messageKeys.list(conversationId),
        (old) =>
          mapMessagePagesInCache(old, messageId, (m) => {
            const reactions = m.reactions ?? [];
            if (
              reactions.some((r) => r.userId === user.id && r.emoji === emoji)
            ) {
              return m;
            }
            const withoutMine = reactions.filter((r) => r.userId !== user.id);
            return {
              ...m,
              reactions: [
                ...withoutMine,
                {
                  id: `optimistic:${messageId}:${emoji}:${user.id}`,
                  emoji,
                  userId: user.id,
                  user: { id: user.id, username: user.username },
                },
              ],
            };
          }),
      );
      return { previous };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(messageKeys.list(conversationId), context.previous);
      }
      toast.error(e.message ?? "Could not add reaction");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: messageKeys.list(conversationId) });
    },
  });
}

export function useRemoveMessageReaction(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      removeMessageReaction(conversationId, messageId, emoji),
    onMutate: async ({ messageId, emoji }) => {
      await qc.cancelQueries({ queryKey: messageKeys.list(conversationId) });
      const previous = qc.getQueryData<InfiniteData<Message[]>>(
        messageKeys.list(conversationId),
      );
      const user = useAuthStore.getState().user;
      if (!user) {
        return { previous };
      }
      qc.setQueryData<InfiniteData<Message[]>>(
        messageKeys.list(conversationId),
        (old) =>
          mapMessagePagesInCache(old, messageId, (m) => ({
            ...m,
            reactions: (m.reactions ?? []).filter(
              (r) => !(r.userId === user.id && r.emoji === emoji),
            ),
          })),
      );
      return { previous };
    },
    onError: (e: Error, _vars, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(messageKeys.list(conversationId), context.previous);
      }
      toast.error(e.message ?? "Could not remove reaction");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: messageKeys.list(conversationId) });
    },
  });
}

export function useEditConversationMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, text }: { messageId: string; text: string }) =>
      editConversationMessage(conversationId, messageId, text),
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
