"use client";

import { useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useConversation, useMarkRead } from "../hooks/use-conversations";
import { useMessages } from "../hooks/use-messages";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";

interface ChatPanelProps {
  conversationId: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function ChatPanel({
  conversationId,
  onBack,
  showBackButton,
}: ChatPanelProps) {
  const { data: convData, isLoading: convLoading } =
    useConversation(conversationId);
  const {
    data: msgData,
    isLoading: msgLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useMessages(conversationId);
  const { mutate: markRead } = useMarkRead();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const didMarkReadRef = useRef<string | null>(null);
  const prevMessageCountRef = useRef(0);

  const conversation = convData?.conversation;

  // Mark as read when opening a conversation
  useEffect(() => {
    if (conversationId && didMarkReadRef.current !== conversationId) {
      didMarkReadRef.current = conversationId;
      markRead(conversationId);
    }
  }, [conversationId, markRead]);

  // Messages come in desc order per page; flatten and reverse for display
  const messages = useMemo(() => {
    if (!msgData?.pages) return [];
    return msgData.pages.flatMap((page) => page).reverse();
  }, [msgData]);

  // Auto-scroll to bottom only on NEW messages (not when loading older)
  const scrollToBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useEffect(() => {
    const currentCount = messages.length;
    const prevCount = prevMessageCountRef.current;

    // Scroll to bottom on initial load or when new messages arrive at the end
    if (prevCount === 0 && currentCount > 0) {
      // Initial load
      scrollToBottom();
    } else if (currentCount > prevCount && prevCount > 0) {
      // New message added — only scroll if already near bottom
      const el = scrollContainerRef.current;
      if (el) {
        const isNearBottom =
          el.scrollHeight - el.scrollTop - el.clientHeight < 100;
        if (isNearBottom) {
          scrollToBottom();
        }
      }
    }

    prevMessageCountRef.current = currentCount;
  }, [messages.length, scrollToBottom]);

  const name =
    conversation?.participantName ||
    conversation?.participantId ||
    "Conversation";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        {showBackButton && (
          <Button variant="ghost" size="icon-sm" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
        )}
        {convLoading ? (
          <Skeleton className="h-5 w-40" />
        ) : (
          <>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium">{name}</h3>
              {conversation?.channel?.name && (
                <p className="text-xs text-muted-foreground">
                  {conversation.channel.name}
                </p>
              )}
            </div>
            {conversation?.status && (
              <Badge
                variant={
                  conversation.status === "OPEN" ? "default" : "secondary"
                }
              >
                {conversation.status}
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Messages area - plain div with overflow scroll */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
        {msgLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
              >
                <Skeleton className="h-12 w-48 rounded-lg" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <MessageSquare className="size-10 opacity-40" />
            <p className="text-sm">No messages yet. Send the first message!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {hasNextPage && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Loading..." : "Load older messages"}
                </Button>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0">
        <MessageComposer conversationId={conversationId} />
      </div>
    </div>
  );
}
