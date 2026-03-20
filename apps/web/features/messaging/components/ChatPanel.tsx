"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, ArrowLeft, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useConversation, useMarkRead } from "../hooks/use-conversations";
import {
  useMessages,
  useAddMessageReaction,
  useRemoveMessageReaction,
  useEditConversationMessage,
} from "../hooks/use-messages";
import type { Message } from "../services/messaging.service";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { cn } from "@/lib/utils";

/** Pixels from bottom to count as "stuck" to latest (auto-scroll new messages). */
const STICK_THRESHOLD_PX = 120;
/** Show jump-to-latest when further than this from the bottom. */
const JUMP_BUTTON_THRESHOLD_PX = 200;

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
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useMessages(conversationId);
  const { mutate: markRead } = useMarkRead();
  const currentUserId = useAuthStore((s) => s.user?.id ?? "");
  const addReaction = useAddMessageReaction(conversationId);
  const removeReaction = useRemoveMessageReaction(conversationId);
  const editMessage = useEditConversationMessage(conversationId);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const didMarkReadRef = useRef<string | null>(null);
  const prevLastMessageIdRef = useRef<string | undefined>(undefined);
  /** User expects new traffic to stay in view (default true; false after scrolling up). */
  const stickToBottomRef = useRef(true);
  /** After sending, keep pinning through refetch (fixes scroll-before-DOM-updates). */
  const pendingPinAfterOutgoingRef = useRef(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const conversation = convData?.conversation;

  // Mark as read when opening a conversation
  useEffect(() => {
    if (conversationId && didMarkReadRef.current !== conversationId) {
      didMarkReadRef.current = conversationId;
      markRead(conversationId);
    }
  }, [conversationId, markRead]);

  useEffect(() => {
    setReplyTo(null);
  }, [conversationId]);

  // Messages come in desc order per page; flatten and reverse for display
  const messages = useMemo(() => {
    if (!msgData?.pages) return [];
    return msgData.pages.flatMap((page) => page).reverse();
  }, [msgData]);

  const lastMessageId = messages[messages.length - 1]?.id;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const run = () => {
      const s = scrollContainerRef.current;
      if (!s) return;
      s.scrollTo({ top: s.scrollHeight, behavior });
    };
    // Two frames: wait for React paint + layout (e.g. after infinite query refetch)
    requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
  }, []);

  const updateScrollDerivedState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distFromBottom <= STICK_THRESHOLD_PX;
    setShowJumpToLatest(distFromBottom > JUMP_BUTTON_THRESHOLD_PX);
  }, []);

  const handleMessagesScroll = useCallback(() => {
    updateScrollDerivedState();
  }, [updateScrollDerivedState]);

  // Must run before other layout effects so we don't treat prior thread's last id as baseline
  useLayoutEffect(() => {
    prevLastMessageIdRef.current = undefined;
    stickToBottomRef.current = true;
    pendingPinAfterOutgoingRef.current = false;
    setShowJumpToLatest(false);
  }, [conversationId]);

  // After messages / last id change: auto-scroll if user is pinned to bottom
  useLayoutEffect(() => {
    if (msgLoading && messages.length === 0) return;
    if (messages.length === 0) return;

    const prev = prevLastMessageIdRef.current;
    const changedLast = lastMessageId !== prev;

    if (prev === undefined && lastMessageId) {
      prevLastMessageIdRef.current = lastMessageId;
      scrollToBottom();
      updateScrollDerivedState();
      return;
    }

    if (!lastMessageId) return;

    if (
      changedLast &&
      (stickToBottomRef.current || pendingPinAfterOutgoingRef.current)
    ) {
      prevLastMessageIdRef.current = lastMessageId;
      scrollToBottom();
      pendingPinAfterOutgoingRef.current = false;
      updateScrollDerivedState();
      return;
    }

    prevLastMessageIdRef.current = lastMessageId;
  }, [
    messages,
    msgLoading,
    lastMessageId,
    scrollToBottom,
    updateScrollDerivedState,
  ]);

  // Refetch finished (e.g. after send): if we pinned, scroll now that DOM includes the new row
  useEffect(() => {
    if (msgLoading || messages.length === 0) return;
    if (
      !isFetching &&
      (stickToBottomRef.current || pendingPinAfterOutgoingRef.current)
    ) {
      scrollToBottom();
      if (pendingPinAfterOutgoingRef.current) {
        pendingPinAfterOutgoingRef.current = false;
      }
      updateScrollDerivedState();
    }
  }, [
    isFetching,
    msgLoading,
    messages.length,
    conversationId,
    scrollToBottom,
    updateScrollDerivedState,
  ]);

  const onSendSuccess = useCallback(() => {
    stickToBottomRef.current = true;
    pendingPinAfterOutgoingRef.current = true;
    scrollToBottom();
  }, [scrollToBottom]);

  const jumpToLatest = useCallback(() => {
    stickToBottomRef.current = true;
    pendingPinAfterOutgoingRef.current = false;
    scrollToBottom("smooth");
    setShowJumpToLatest(false);
  }, [scrollToBottom]);

  const name =
    conversation?.participantName ||
    conversation?.participantId ||
    "Conversation";

  const handleToggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      const msg = messages.find((m) => m.id === messageId);
      const has = msg?.reactions?.some(
        (r) => r.userId === currentUserId && r.emoji === emoji,
      );
      if (has) {
        removeReaction.mutate({ messageId, emoji });
      } else {
        addReaction.mutate({ messageId, emoji });
      }
    },
    [messages, currentUserId, addReaction, removeReaction],
  );

  const handleSaveEdit = useCallback(
    async (messageId: string, text: string) => {
      await editMessage.mutateAsync({ messageId, text });
    },
    [editMessage],
  );

  const reactionPendingForMessage = useCallback(
    (messageId: string) =>
      (addReaction.isPending &&
        addReaction.variables?.messageId === messageId) ||
      (removeReaction.isPending &&
        removeReaction.variables?.messageId === messageId),
    [
      addReaction.isPending,
      addReaction.variables?.messageId,
      removeReaction.isPending,
      removeReaction.variables?.messageId,
    ],
  );

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
            <ParticipantAvatar
              imageUrl={conversation?.participantProfilePictureUrl}
              name={name}
              size="sm"
            />
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

      {/* Messages area + jump-to-latest */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          onScroll={handleMessagesScroll}
          className="h-full overflow-y-auto p-4"
        >
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
              <p className="text-sm">
                No messages yet. Send the first message!
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-12">
              {/* pt-12: room above first bubble so ReactionBar (bottom-full) is not clipped by overflow-y-auto */}
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
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  participantAvatarUrl={
                    conversation?.participantProfilePictureUrl
                  }
                  participantDisplayName={name}
                  currentUserId={currentUserId}
                  onReply={setReplyTo}
                  onToggleReaction={handleToggleReaction}
                  onSaveEdit={handleSaveEdit}
                  reactionPending={reactionPendingForMessage(msg.id)}
                  editPending={editMessage.isPending}
                />
              ))}
            </div>
          )}
        </div>

        {showJumpToLatest && messages.length > 0 && !msgLoading && (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className={cn(
              "absolute bottom-3 right-4 z-10 size-10 rounded-full shadow-md",
              "border bg-background/95 backdrop-blur-sm",
            )}
            onClick={jumpToLatest}
            aria-label="Scroll to latest messages"
          >
            <ArrowDown className="size-5" />
          </Button>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0">
        <MessageComposer
          conversationId={conversationId}
          onSendSuccess={onSendSuccess}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  );
}
