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

/** Coalesce rapid socket events + reduce races with mutation-driven invalidation. */
const MESSAGE_LIST_INVALIDATION_DEBOUNCE_MS = 150;

const isDevRuntime = process.env.NODE_ENV === "development";

function debugMessagingSocket(event: string, payload: unknown): void {
  if (!isDevRuntime) return;
  console.debug(`[MessagingSocket] ${event}`, payload);
}

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
    const messageInvalidationTimers = new Map<
      string,
      ReturnType<typeof setTimeout>
    >();

    const scheduleInvalidateMessageList = (
      conversationId: string,
      sourceEvent: string,
      payload?: unknown,
    ) => {
      debugMessagingSocket(sourceEvent, {
        conversationId,
        ...(payload !== undefined ? { payload } : {}),
      });
      const existing = messageInvalidationTimers.get(conversationId);
      if (existing !== undefined) {
        clearTimeout(existing);
      }
      const tid = setTimeout(() => {
        messageInvalidationTimers.delete(conversationId);
        void qc.invalidateQueries({
          queryKey: messageKeys.list(conversationId),
        });
      }, MESSAGE_LIST_INVALIDATION_DEBOUNCE_MS);
      messageInvalidationTimers.set(conversationId, tid);
    };

    const onSocketConnect = () => {
      if (isDevRuntime) {
        console.debug("[MessagingSocket] connected", { id: socket.id });
      }
    };

    const onSocketDisconnect = (reason: string) => {
      if (isDevRuntime) {
        console.debug("[MessagingSocket] disconnected", { reason });
      }
    };

    const onNewMessage = (data: { conversationId: string }) => {
      scheduleInvalidateMessageList(
        data.conversationId,
        "messaging:new-message",
        data,
      );
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
                      ? (data.lastMessageText ?? null)
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
        scheduleInvalidateMessageList(
          data.conversationId,
          "messaging:message-status",
          data,
        );
        return;
      }
      // Legacy payloads without conversationId: refresh all cached message threads.
      if (data.messageId) {
        debugMessagingSocket("messaging:message-status (all lists)", data);
        void qc.invalidateQueries({ queryKey: messageKeys.lists() });
      }
    };

    const onReactionAdded = (data: { conversationId: string }) => {
      scheduleInvalidateMessageList(
        data.conversationId,
        "messaging:reaction-added",
        data,
      );
    };

    const onReactionRemoved = (data: { conversationId: string }) => {
      scheduleInvalidateMessageList(
        data.conversationId,
        "messaging:reaction-removed",
        data,
      );
    };

    const onMessageEdited = (data: { conversationId: string }) => {
      scheduleInvalidateMessageList(
        data.conversationId,
        "messaging:message-edited",
        data,
      );
    };

    socket.on("connect", onSocketConnect);
    socket.on("disconnect", onSocketDisconnect);
    if (socket.connected) {
      onSocketConnect();
    }
    socket.on("messaging:new-message", onNewMessage);
    socket.on("messaging:conversation-updated", onConversationUpdated);
    socket.on("messaging:message-status", onMessageStatus);
    socket.on("messaging:reaction-added", onReactionAdded);
    socket.on("messaging:reaction-removed", onReactionRemoved);
    socket.on("messaging:message-edited", onMessageEdited);

    return () => {
      for (const tid of messageInvalidationTimers.values()) {
        clearTimeout(tid);
      }
      messageInvalidationTimers.clear();
      socket.off("connect", onSocketConnect);
      socket.off("disconnect", onSocketDisconnect);
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
