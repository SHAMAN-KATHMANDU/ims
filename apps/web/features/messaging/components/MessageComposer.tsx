"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useSendMessage } from "../hooks/use-messages";

interface MessageComposerProps {
  conversationId: string;
}

export function MessageComposer({ conversationId }: MessageComposerProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mutate: send, isPending } = useSendMessage(conversationId);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;

    send(
      { text: trimmed },
      {
        onSuccess: () => {
          setText("");
          textareaRef.current?.focus();
        },
      },
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t p-3">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        rows={1}
        className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        style={{ maxHeight: "120px", overflow: "auto" }}
      />
      <Button
        size="icon"
        onClick={handleSend}
        disabled={!text.trim() || isPending}
      >
        <Send className="size-4" />
      </Button>
    </div>
  );
}
