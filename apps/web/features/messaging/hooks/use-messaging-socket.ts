"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { acquireSocket, releaseSocket } from "@/lib/socket";
import { conversationKeys } from "./use-conversations";
import { messageKeys } from "./use-messages";
import type {
  Conversation,
  ConversationListResponse,
} from "../services/messaging.service";

function sortConversationsByLastMessageAtDesc(
  conversations: Conversation[],
): Conversation[] {
  return [...conversations].sort((a, b) => {
    const ta = a.lastMessageAt
      ? new Date(a.lastMessageAt).getTime()
      : Number.NEGATIVE_INFINITY;
    const tb = b.lastMessageAt
      ? new Date(b.lastMessageAt).getTime()
      : Number.NEGATIVE_INFINITY;
    return tb - ta;
  });
}

export function useMessagingSocket() {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = acquireSocket();

    const onNewMessage = (data: { conversationId: string }) => {
      qc.invalidateQueries({
        queryKey: messageKeys.list(data.conversationId),
      });
    };

    const onConversationUpdated = (data: {
      id: string;
      lastMessageAt: string | Date;
      lastMessageText?: string | null;
      unreadCount?: number;
    }) => {
      const lastMessageAtIso =
        typeof data.lastMessageAt === "string"
          ? data.lastMessageAt
          : data.lastMessageAt.toISOString();

      let missingInAnyCachedList = false;

      qc.setQueriesData<ConversationListResponse>(
        { queryKey: conversationKeys.lists() },
        (old) => {
          if (!old) {
            missingInAnyCachedList = true;
            return old;
          }
          const conversations = old.conversations ?? [];
          const idx = conversations.findIndex((c) => c.id === data.id);
          if (idx < 0) {
            missingInAnyCachedList = true;
            return old;
          }
          const next = conversations.map((c, i) =>
            i === idx
              ? {
                  ...c,
                  lastMessageAt: lastMessageAtIso,
                  lastMessageText:
                    data.lastMessageText !== undefined
                      ? data.lastMessageText ?? null
                      : c.lastMessageText,
                  ...(data.unreadCount !== undefined
                    ? { unreadCount: data.unreadCount }
                    : {}),
                }
              : c,
          );
          return {
            ...old,
            conversations: sortConversationsByLastMessageAtDesc(next),
          };
        },
      );

      if (missingInAnyCachedList) {
        qc.invalidateQueries({ queryKey: conversationKeys.lists() });
      }
    };

    const onMessageStatus = (data: {
      messageId?: string;
      conversationId?: string;
    }) => {
      if (data.conversationId) {
        qc.invalidateQueries({
          queryKey: messageKeys.list(data.conversationId),
        });
        return;
      }
      // Legacy payloads without conversationId: refresh all cached message threads.
      if (data.messageId) {
        void qc.invalidateQueries({ queryKey: messageKeys.lists() });
      }
    };

    const invalidateMessages = (conversationId: string) => {
      qc.invalidateQueries({
        queryKey: messageKeys.list(conversationId),
      });
    };

    const onReactionAdded = (data: { conversationId: string }) => {
      invalidateMessages(data.conversationId);
    };

    const onReactionRemoved = (data: { conversationId: string }) => {
      invalidateMessages(data.conversationId);
    };

    const onMessageEdited = (data: { conversationId: string }) => {
      invalidateMessages(data.conversationId);
    };

    socket.on("messaging:new-message", onNewMessage);
    socket.on("messaging:conversation-updated", onConversationUpdated);
    socket.on("messaging:message-status", onMessageStatus);
    socket.on("messaging:reaction-added", onReactionAdded);
    socket.on("messaging:reaction-removed", onReactionRemoved);
    socket.on("messaging:message-edited", onMessageEdited);

    return () => {
      socket.off("messaging:new-message", onNewMessage);
      socket.off("messaging:conversation-updated", onConversationUpdated);
      socket.off("messaging:message-status", onMessageStatus);
      socket.off("messaging:reaction-added", onReactionAdded);
      socket.off("messaging:reaction-removed", onReactionRemoved);
      socket.off("messaging:message-edited", onMessageEdited);
      releaseSocket();
    };
  }, [qc]);
}
