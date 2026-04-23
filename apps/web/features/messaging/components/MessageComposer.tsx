"use client";

import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Video, X } from "lucide-react";
import { toast } from "sonner";
import { useSendMessage } from "../hooks/use-messages";
import type { Message } from "../services/messaging.service";
import { cn } from "@/lib/utils";
import { useS3DirectUpload } from "@/features/media";
import { EnvFeature, useEnvFeatureFlag } from "@/features/flags";

function replyPreviewSnippet(msg: Message): string {
  const t = msg.textContent?.trim();
  if (t) return t.length > 80 ? `${t.slice(0, 80)}…` : t;
  if (msg.contentType === "IMAGE" || msg.contentType === "STICKER") {
    return "Photo";
  }
  if (msg.contentType === "VIDEO") return "Video";
  return "Message";
}

/** Max height for auto-growing message input (matches Tailwind max-h below). */
const TEXTAREA_MAX_PX = 208;

/** Matches `accept` on the hidden file input (used for drag-and-drop validation). */
const ACCEPTED_MESSAGING_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

function isAcceptedMessagingFile(file: File): boolean {
  if (ACCEPTED_MESSAGING_MIME.has(file.type)) return true;
  const lower = file.name.toLowerCase();
  return (
    lower.endsWith(".mov") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm")
  );
}

function isLikelyVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  const lower = file.name.toLowerCase();
  return (
    lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov")
  );
}

interface MessageComposerProps {
  conversationId: string;
  onSendSuccess?: () => void;
  replyTo?: Message | null;
  onClearReply?: () => void;
}

export function MessageComposer({
  conversationId,
  onSendSuccess,
  replyTo,
  onClearReply,
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isFileDragOver, setIsFileDragOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: sendAsync, isPending: isSendPending } =
    useSendMessage(conversationId);
  const { uploadFile, mediaUploadEnabled } = useS3DirectUpload();
  const messagingEnabled = useEnvFeatureFlag(EnvFeature.MESSAGING);
  const [isDirectUploading, setIsDirectUploading] = useState(false);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_PX)}px`;
  }, [text]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  const clearAttachment = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const busy = isSendPending || isDirectUploading;

  function attachFileIfAllowed(file: File | undefined) {
    if (!file) return;
    if (!mediaUploadEnabled || !messagingEnabled) {
      toast.error("Media upload is not available in this environment.");
      return;
    }
    if (!isAcceptedMessagingFile(file)) {
      toast.error(
        "Use a photo or video: JPEG, PNG, GIF, WebP, MP4, WebM, or MOV.",
      );
      return;
    }
    setSelectedFile(file);
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    attachFileIfAllowed(file);
  };

  const handleComposerDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.types.includes("Files")) return;
    setIsFileDragOver(true);
  };

  const handleComposerDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setIsFileDragOver(false);
  };

  const handleComposerDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const handleComposerDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragOver(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    attachFileIfAllowed(file);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    const canSend = trimmed.length > 0 || selectedFile !== null;
    if (!canSend || isSendPending || isDirectUploading) return;

    const afterSuccess = () => {
      setText("");
      clearAttachment();
      onClearReply?.();
      textareaRef.current?.focus();
      onSendSuccess?.();
    };

    const replyToId = replyTo?.id;

    if (selectedFile) {
      void (async () => {
        try {
          setIsDirectUploading(true);
          setUploadProgress(0);
          const { mediaAssetId } = await uploadFile({
            file: selectedFile,
            purpose: "message_media",
            entityType: "messages",
            entityId: conversationId,
            registerInLibrary: true,
          });
          setUploadProgress(100);
          await sendAsync({
            text: trimmed.length > 0 ? trimmed : undefined,
            mediaAssetId,
            mediaType: isLikelyVideoFile(selectedFile) ? "video" : "image",
            ...(replyToId ? { replyToId } : {}),
          });
          afterSuccess();
        } catch {
          // Toast from axios interceptor or upload hook
        } finally {
          setUploadProgress(null);
          setIsDirectUploading(false);
        }
      })();
      return;
    }

    void sendAsync({
      text: trimmed,
      ...(replyToId ? { replyToId } : {}),
    }).then(() => {
      afterSuccess();
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSubmit = (text.trim().length > 0 || selectedFile !== null) && !busy;

  return (
    <div
      className={cn(
        "border-t transition-colors",
        isFileDragOver &&
          "bg-muted/40 ring-2 ring-inset ring-primary/50 ring-offset-0",
      )}
      onDragEnter={handleComposerDragEnter}
      onDragLeave={handleComposerDragLeave}
      onDragOver={handleComposerDragOver}
      onDrop={handleComposerDrop}
      role="group"
      aria-label="Message composer. Drop a photo or video here to attach."
    >
      {replyTo && (
        <div className="flex items-start gap-2 border-b bg-muted/40 px-3 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-primary pl-2 text-sm">
            <p className="text-xs font-medium text-muted-foreground">
              Replying to{" "}
              {replyTo.direction === "OUTBOUND" ? "yourself" : "contact"}
            </p>
            <p className="truncate text-foreground">
              {replyPreviewSnippet(replyTo)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            onClick={() => onClearReply?.()}
            aria-label="Cancel reply"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}
      {selectedFile && (
        <div className="flex items-start gap-2 border-b p-3">
          <div className="relative shrink-0">
            {isLikelyVideoFile(selectedFile) ? (
              <div className="flex size-16 items-center justify-center rounded-md border bg-muted">
                <Video
                  className="size-8 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            ) : previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="size-16 rounded-md object-cover"
              />
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              className="absolute -right-2 -top-2 size-6 rounded-full shadow"
              onClick={() => clearAttachment()}
              aria-label="Remove attachment"
            >
              <X className="size-3" aria-hidden="true" />
            </Button>
          </div>
          <div className="min-w-0 flex-1 text-xs text-muted-foreground">
            <p className="truncate font-medium text-foreground">
              {selectedFile.name}
            </p>
            {uploadProgress !== null && isDirectUploading && (
              <p className="mt-1">Uploading… {uploadProgress}%</p>
            )}
          </div>
        </div>
      )}
      <div className="flex items-end gap-2 p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,.mov"
          className="hidden"
          aria-label="Choose photo or video to attach"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          disabled={busy || !mediaUploadEnabled}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach photo or video"
        >
          <Paperclip className="size-4" aria-hidden="true" />
        </Button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isFileDragOver
              ? "Drop file to attach…"
              : "Type a message… (or drop a photo/video here)"
          }
          rows={2}
          className={cn(
            "flex-1 resize-none rounded-md border bg-background px-3 py-2.5 text-sm min-h-11",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "max-h-52 overflow-y-auto",
          )}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!canSubmit}
          aria-busy={busy}
          aria-label="Send message"
        >
          <Send className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
