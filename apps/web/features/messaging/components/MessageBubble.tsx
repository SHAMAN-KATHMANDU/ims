"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Message, MessageReplySnippet } from "../services/messaging.service";
import { resolveMessagingAssetUrl } from "../services/messaging.service";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { MessageContextMenu } from "./MessageContextMenu";
import { ReactionBar } from "./ReactionBar";
import { ReactionPills } from "./ReactionPills";

const TEXT_TRUNCATE_AT = 1000;

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="size-3 text-muted-foreground" />,
  SENT: <Check className="size-3 text-muted-foreground" />,
  DELIVERED: <CheckCheck className="size-3 text-muted-foreground" />,
  READ: <CheckCheck className="size-3 text-primary" />,
  FAILED: <AlertCircle className="size-3 text-destructive" />,
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

  const isOutbound = message.direction === "OUTBOUND";
  const time = message.sentAt || message.createdAt;
  const rawMediaUrl = getMediaUrl(message.mediaPayload);
  const mediaUrl = rawMediaUrl ? resolveMessagingAssetUrl(rawMediaUrl) : null;

  const sentByCurrentUser =
    message.sentById === currentUserId ||
    message.sentBy?.id === currentUserId;

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

  const fullText = message.textContent ?? "";
  const shouldTruncate = fullText.length > TEXT_TRUNCATE_AT;
  const displayText =
    shouldTruncate && !isExpanded
      ? `${fullText.slice(0, TEXT_TRUNCATE_AT)}…`
      : fullText;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyableText);
      toast.success("Message copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const startEdit = () => {
    setEditText(message.textContent ?? "");
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditText(message.textContent ?? "");
  };

  const saveEdit = async () => {
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

  const bubbleBody = (
    <div
      className={cn(
        "max-w-[min(75%,36rem)] min-w-0 rounded-lg px-3 py-2 text-sm cursor-context-menu",
        isOutbound
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground",
      )}
    >
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
            <div className="whitespace-pre-wrap break-words">
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
        <span>
          {formatDistanceToNow(new Date(time), { addSuffix: true })}
        </span>
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
    >
      {!isOutbound && (
        <ParticipantAvatar
          imageUrl={participantAvatarUrl}
          name={participantDisplayName}
          size="sm"
          className="mt-1 shrink-0 self-end"
        />
      )}
      <div
        className={cn(
          "relative flex min-w-0 max-w-full flex-col",
          isOutbound ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "absolute z-10 mb-1 transition-opacity",
            "bottom-full",
            isOutbound ? "right-0" : "left-0",
            // Touch / coarse pointers: keep reactions visible (hover is unreliable).
            "pointer-coarse:pointer-events-auto pointer-coarse:opacity-100",
            "pointer-fine:pointer-events-none pointer-fine:opacity-0 pointer-fine:group-hover:pointer-events-auto pointer-fine:group-hover:opacity-100",
          )}
        >
          <ReactionBar
            onSelect={(emoji) => onToggleReaction(message.id, emoji)}
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
    </div>
  );
}
