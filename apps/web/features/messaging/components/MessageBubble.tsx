"use client";

import { cn } from "@/lib/utils";
import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Message } from "../services/messaging.service";

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="size-3 text-muted-foreground" />,
  SENT: <Check className="size-3 text-muted-foreground" />,
  DELIVERED: <CheckCheck className="size-3 text-muted-foreground" />,
  READ: <CheckCheck className="size-3 text-primary" />,
  FAILED: <AlertCircle className="size-3 text-destructive" />,
};

/**
 * Extract media URL from various payload shapes:
 * - Facebook inbound: { type: "image", payload: { url: "..." } }
 * - Outbound/stored: { url: "...", type: "image" }
 */
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

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === "OUTBOUND";
  const time = message.sentAt || message.createdAt;
  const mediaUrl = getMediaUrl(message.mediaPayload);

  return (
    <div
      className={cn(
        "flex w-full",
        isOutbound ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-3 py-2 text-sm",
          isOutbound
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {message.textContent && (
          <p className="whitespace-pre-wrap break-words">
            {message.textContent}
          </p>
        )}
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
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[10px]",
            isOutbound ? "justify-end opacity-70" : "text-muted-foreground",
          )}
        >
          <span>
            {formatDistanceToNow(new Date(time), { addSuffix: true })}
          </span>
          {isOutbound && statusIcons[message.status]}
        </div>
      </div>
    </div>
  );
}
