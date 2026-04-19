"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { cn } from "@/lib/utils";
import {
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  ChevronDown,
  CornerUpLeft,
  Smile,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type {
  Message,
  MessageReplySnippet,
} from "../services/messaging.service";
import { resolveMessagingAssetUrl } from "../services/messaging.service";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { MessageContextMenu } from "./MessageContextMenu";
import { ReactionBar, QUICK_REACTION_EMOJIS } from "./ReactionBar";
import { ReactionPills } from "./ReactionPills";

const TEXT_TRUNCATE_AT = 1000;
const HOVER_ACTION_DELAY_MS = 400;
const LONG_PRESS_DELAY_MS = 450;
const LONG_PRESS_VISIBLE_MS = 2500;

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: (
    <Clock className="size-3 text-muted-foreground" aria-label="Sending" />
  ),
  SENT: <Check className="size-3 text-muted-foreground" aria-label="Sent" />,
  DELIVERED: (
    <CheckCheck
      className="size-3 text-muted-foreground"
      aria-label="Delivered"
    />
  ),
  READ: <CheckCheck className="size-3 text-primary" aria-label="Read" />,
  FAILED: (
    <AlertCircle
      className="size-3 text-destructive"
      aria-label="Failed to send"
    />
  ),
};

function getMediaUrl(mediaPayload: unknown): string | null {
  if (!mediaPayload || typeof mediaPayload !== "object") return null;
  const p = mediaPayload as Record<string, unknown>;
  const payload = p.payload as Record<string, unknown> | undefined;
  if (payload?.url && typeof payload.url === "string") return payload.url;
  if (typeof p.url === "string") return p.url;
  return null;
}

function isImageType(contentType: string, mediaPayload: unknown): boolean {
  if (contentType === "IMAGE" || contentType === "STICKER") return true;
  if (
    mediaPayload &&
    typeof mediaPayload === "object" &&
    (mediaPayload as Record<string, unknown>).type === "image"
  )
    return true;
  return false;
}

function isVideoType(contentType: string, mediaPayload: unknown): boolean {
  if (contentType === "VIDEO") return true;
  if (
    mediaPayload &&
    typeof mediaPayload === "object" &&
    (mediaPayload as Record<string, unknown>).type === "video"
  )
    return true;
  return false;
}

function replyPreviewLabel(replyTo: MessageReplySnippet): string {
  const t = replyTo.textContent?.trim();
  if (t) {
    return t.length > 120 ? `${t.slice(0, 120)}…` : t;
  }
  if (replyTo.contentType === "IMAGE" || replyTo.contentType === "STICKER") {
    return "Photo";
  }
  if (replyTo.contentType === "VIDEO") return "Video";
  if (replyTo.contentType === "AUDIO") return "Audio";
  return "Message";
}

function actionVisibilityClass(showActions: boolean): string {
  return cn(
    "transition-opacity duration-150",
    showActions
      ? "pointer-events-auto opacity-100"
      : "pointer-events-none opacity-0",
  );
}

interface MessageBubbleProps {
  message: Message;
  participantAvatarUrl?: string | null;
  participantDisplayName?: string;
  currentUserId: string;
  onReply: (message: Message) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onSaveEdit: (messageId: string, text: string) => Promise<void>;
  reactionPending?: boolean;
  editPending?: boolean;
}

export function MessageBubble({
  message,
  participantAvatarUrl,
  participantDisplayName = "Contact",
  currentUserId,
  onReply,
  onToggleReaction,
  onSaveEdit,
  reactionPending,
  editPending,
}: MessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.textContent ?? "");
  const [showActions, setShowActions] = useState(false);
  const [reactPopoverOpen, setReactPopoverOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const longPressHideTimerRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const longPressTriggeredRef = useRef(false);
  const { resolvedTheme } = useTheme();
  const pickerTheme = resolvedTheme === "dark" ? "dark" : "light";

  const isOutbound = message.direction === "OUTBOUND";
  const time = message.sentAt || message.createdAt;
  const rawMediaUrl = getMediaUrl(message.mediaPayload);
  const mediaUrl = rawMediaUrl ? resolveMessagingAssetUrl(rawMediaUrl) : null;

  const sentByCurrentUser =
    message.sentById === currentUserId || message.sentBy?.id === currentUserId;

  const canEdit =
    isOutbound && sentByCurrentUser && message.status !== "FAILED";

  const copyableText =
    (message.textContent?.trim() ?? "") ||
    (rawMediaUrl ? resolveMessagingAssetUrl(rawMediaUrl) : "");
  const canCopy = copyableText.length > 0;

  useEffect(() => {
    setIsExpanded(false);
    setIsEditing(false);
    setEditText(message.textContent ?? "");
  }, [message.id, message.textContent]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current !== undefined) {
        clearTimeout(hoverTimerRef.current);
      }
      if (longPressTimerRef.current !== undefined) {
        clearTimeout(longPressTimerRef.current);
      }
      if (longPressHideTimerRef.current !== undefined) {
        clearTimeout(longPressHideTimerRef.current);
      }
    };
  }, []);

  const handleRowMouseEnter = (): void => {
    if (hoverTimerRef.current !== undefined) {
      clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = setTimeout(() => {
      setShowActions(true);
    }, HOVER_ACTION_DELAY_MS);
  };

  const handleRowMouseLeave = (): void => {
    if (hoverTimerRef.current !== undefined) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = undefined;
    }
    setShowActions(false);
  };

  const clearLongPressTimers = (): void => {
    if (longPressTimerRef.current !== undefined) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }
    if (longPressHideTimerRef.current !== undefined) {
      clearTimeout(longPressHideTimerRef.current);
      longPressHideTimerRef.current = undefined;
    }
  };

  const showActionsBriefly = (): void => {
    setShowActions(true);
    if (longPressHideTimerRef.current !== undefined) {
      clearTimeout(longPressHideTimerRef.current);
    }
    longPressHideTimerRef.current = setTimeout(() => {
      setShowActions(false);
      longPressHideTimerRef.current = undefined;
    }, LONG_PRESS_VISIBLE_MS);
  };

  const handleTouchStart = (): void => {
    clearLongPressTimers();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      showActionsBriefly();
      longPressTimerRef.current = undefined;
    }, LONG_PRESS_DELAY_MS);
  };

  const handleTouchEnd = (): void => {
    if (
      !longPressTriggeredRef.current &&
      longPressTimerRef.current !== undefined
    ) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }
  };

  const handleTouchMove = (): void => {
    if (longPressTimerRef.current !== undefined) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }
  };

  const fullText = message.textContent ?? "";
  const shouldTruncate = fullText.length > TEXT_TRUNCATE_AT;
  const displayText =
    shouldTruncate && !isExpanded
      ? `${fullText.slice(0, TEXT_TRUNCATE_AT)}…`
      : fullText;

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(copyableText);
      toast.success("Message copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const startEdit = (): void => {
    setEditText(message.textContent ?? "");
    setIsEditing(true);
  };

  const cancelEdit = (): void => {
    setIsEditing(false);
    setEditText(message.textContent ?? "");
  };

  const saveEdit = async (): Promise<void> => {
    const next = editText.trim();
    if (!next) {
      toast.error("Message cannot be empty");
      return;
    }
    try {
      await onSaveEdit(message.id, next);
      setIsEditing(false);
    } catch {
      // handled by mutation / api layer
    }
  };

  const handleReactFromMenu = (emoji: string): void => {
    onToggleReaction(message.id, emoji);
    setMoreMenuOpen(false);
    setShowActions(false);
  };

  const actionButtonClass = cn(
    "size-7 shrink-0 rounded-full border bg-background/90 shadow-sm backdrop-blur-sm",
    "text-foreground hover:bg-accent",
  );

  const messageActionButtons = (
    <div
      className={cn(
        "flex items-center gap-1 self-end pb-1",
        actionVisibilityClass(showActions),
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={actionButtonClass}
        aria-label="Reply"
        onClick={() => onReply(message)}
      >
        <CornerUpLeft className="size-4" />
      </Button>
      <Popover open={reactPopoverOpen} onOpenChange={setReactPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={actionButtonClass}
            aria-label="React"
            disabled={reactionPending}
          >
            <Smile className="size-4" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto border-0 p-0 shadow-lg" align="end">
          <ReactionBar
            onSelect={(emoji) => {
              onToggleReaction(message.id, emoji);
              setReactPopoverOpen(false);
            }}
            disabled={reactionPending}
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  const bubbleBody = (
    <div
      className={cn(
        "relative max-w-[min(75%,36rem)] min-w-0 rounded-lg px-3 py-2 pr-8 pt-1 text-sm cursor-context-menu",
        isOutbound
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground",
      )}
    >
      <DropdownMenu open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-0 top-0 z-10 size-7 rounded-md",
              isOutbound
                ? "text-primary-foreground/90 hover:bg-primary-foreground/15 hover:text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              actionVisibilityClass(showActions),
            )}
            aria-label="Message options"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48" align="end">
          <DropdownMenuItem
            onSelect={() => {
              onReply(message);
              setMoreMenuOpen(false);
            }}
          >
            Reply
          </DropdownMenuItem>
          {canCopy ? (
            <DropdownMenuItem
              onSelect={() => {
                void handleCopy();
                setMoreMenuOpen(false);
              }}
            >
              Copy message
            </DropdownMenuItem>
          ) : null}
          {canEdit && !isEditing ? (
            <DropdownMenuItem
              onSelect={() => {
                startEdit();
                setMoreMenuOpen(false);
              }}
            >
              Edit message
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>React</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-[min(24rem,70vh)] w-auto overflow-y-auto p-2">
              <div className="mb-2 flex flex-wrap gap-1">
                {QUICK_REACTION_EMOJIS.map((emoji) => (
                  <DropdownMenuItem
                    key={emoji}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-md p-0 text-lg"
                    onSelect={() => handleReactFromMenu(emoji)}
                  >
                    {emoji}
                  </DropdownMenuItem>
                ))}
              </div>
              <Picker
                data={data}
                theme={pickerTheme}
                onEmojiSelect={(e: { native: string }) =>
                  handleReactFromMenu(e.native)
                }
              />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      {message.replyTo ? (
        <div
          className={cn(
            "mb-2 border-l-2 pl-2 text-xs",
            isOutbound
              ? "border-primary-foreground/60 text-primary-foreground"
              : "border-primary/50 text-foreground",
          )}
        >
          <span className="font-medium opacity-95">
            {message.replyTo.direction === "OUTBOUND" ? "You" : "Contact"}
          </span>
          <p
            className={cn(
              "line-clamp-2",
              isOutbound
                ? "text-primary-foreground/85"
                : "text-muted-foreground",
            )}
          >
            {replyPreviewLabel(message.replyTo)}
          </p>
        </div>
      ) : null}

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className={cn(
              "min-h-20 text-sm",
              isOutbound && "border-primary-foreground/30 bg-primary/90",
            )}
            disabled={editPending}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={cancelEdit}
              disabled={editPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void saveEdit()}
              disabled={editPending}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          {message.textContent ? (
            <div className="whitespace-pre-wrap wrap-break-word">
              <p>{displayText}</p>
              {shouldTruncate && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className={cn(
                    "h-auto px-0 py-0 text-xs font-medium",
                    isOutbound
                      ? "text-primary-foreground/90 underline-offset-2 hover:text-primary-foreground"
                      : "text-primary underline-offset-2",
                  )}
                  onClick={() => setIsExpanded((e) => !e)}
                >
                  {isExpanded ? "Show less" : "Read more"}
                </Button>
              )}
            </div>
          ) : null}
          {mediaUrl && (
            <div className={cn(message.textContent && "mt-1")}>
              {isImageType(message.contentType, message.mediaPayload) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl}
                  alt="Media"
                  className="max-h-64 max-w-full rounded object-contain"
                />
              ) : isVideoType(message.contentType, message.mediaPayload) ? (
                <video
                  src={mediaUrl}
                  controls
                  className="max-h-64 max-w-full rounded"
                />
              ) : (
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  View attachment
                </a>
              )}
            </div>
          )}
        </>
      )}

      <div
        className={cn(
          "mt-1 flex flex-wrap items-center gap-1 text-[10px]",
          isOutbound ? "justify-end opacity-70" : "text-muted-foreground",
        )}
      >
        <span>{formatDistanceToNow(new Date(time), { addSuffix: true })}</span>
        {message.editedAt ? (
          <span className={cn(isOutbound && "text-primary-foreground/80")}>
            (edited)
          </span>
        ) : null}
        {isOutbound && statusIcons[message.status]}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "group flex w-full gap-2",
        isOutbound ? "justify-end" : "justify-start",
      )}
      onMouseEnter={handleRowMouseEnter}
      onMouseLeave={handleRowMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {!isOutbound && (
        <ParticipantAvatar
          imageUrl={participantAvatarUrl}
          name={participantDisplayName}
          size="sm"
          className="mt-1 shrink-0 self-end"
        />
      )}
      {isOutbound ? messageActionButtons : null}
      <div
        className={cn(
          "relative flex min-w-0 max-w-full flex-col",
          isOutbound ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "absolute z-10 mb-1 transition-opacity duration-150",
            "bottom-full",
            isOutbound ? "right-0" : "left-0",
            showActions
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          <ReactionBar
            onSelect={(emoji) => {
              onToggleReaction(message.id, emoji);
              setShowActions(false);
            }}
            disabled={reactionPending}
          />
        </div>

        <MessageContextMenu
          onReply={() => onReply(message)}
          onCopy={() => void handleCopy()}
          onEdit={startEdit}
          onReact={(emoji) => onToggleReaction(message.id, emoji)}
          canCopy={canCopy}
          canEdit={canEdit && !isEditing}
        >
          {bubbleBody}
        </MessageContextMenu>

        <ReactionPills
          reactions={message.reactions}
          currentUserId={currentUserId}
          isOutbound={isOutbound}
          onToggle={(emoji) => onToggleReaction(message.id, emoji)}
          disabled={reactionPending}
        />
      </div>
      {!isOutbound ? messageActionButtons : null}
    </div>
  );
}
