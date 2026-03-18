"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";
import { useMessagingSocket } from "../hooks/use-messaging-socket";
import { ConversationList } from "./ConversationList";
import { ChatPanel } from "./ChatPanel";

export function MessagingPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Establish socket connection for real-time updates
  useMessagingSocket();

  return (
    <>
      {/* Remove parent main padding and overflow for this page */}
      <style>{`
        main { padding: 0 !important; overflow: hidden !important; }
      `}</style>
      <div className="flex h-full overflow-hidden bg-background">
        {/* Left panel - conversation list */}
        <div
          className={cn(
            "h-full w-full shrink-0 border-r sm:w-80",
            isMobile && selectedId && "hidden",
          )}
        >
          <ConversationList selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        {/* Right panel - chat or empty state */}
        <div
          className={cn(
            "flex h-full min-w-0 flex-1 flex-col",
            isMobile && !selectedId && "hidden",
          )}
        >
          {selectedId ? (
            <ChatPanel
              conversationId={selectedId}
              onBack={() => setSelectedId(null)}
              showBackButton={isMobile}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <MessageSquare className="size-16 opacity-30" />
              <p className="text-sm">
                Select a conversation to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
