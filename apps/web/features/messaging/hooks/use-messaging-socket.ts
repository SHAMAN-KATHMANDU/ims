"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";
import { acquireSocket, releaseSocket } from "@/lib/socket";
import { conversationKeys } from "./use-conversations";
import { messageKeys } from "./use-messages";

export function useMessagingSocket() {
  const qc = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced conversation list invalidation to avoid re-render storms
  const invalidateConversationList = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      qc.invalidateQueries({ queryKey: conversationKeys.lists() });
    }, 300);
  }, [qc]);

  useEffect(() => {
    const socket = acquireSocket();
    socketRef.current = socket;

    const onNewMessage = (data: { conversationId: string }) => {
      qc.invalidateQueries({
        queryKey: messageKeys.list(data.conversationId),
      });
      invalidateConversationList();
    };

    const onConversationUpdated = (_data: { id: string }) => {
      invalidateConversationList();
    };

    const onMessageStatus = (data: {
      messageId: string;
      conversationId?: string;
    }) => {
      if (data.conversationId) {
        qc.invalidateQueries({
          queryKey: messageKeys.list(data.conversationId),
        });
      }
    };

    socket.on("messaging:new-message", onNewMessage);
    socket.on("messaging:conversation-updated", onConversationUpdated);
    socket.on("messaging:message-status", onMessageStatus);

    return () => {
      socket.off("messaging:new-message", onNewMessage);
      socket.off("messaging:conversation-updated", onConversationUpdated);
      socket.off("messaging:message-status", onMessageStatus);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      releaseSocket();
    };
  }, [qc, invalidateConversationList]);
}
