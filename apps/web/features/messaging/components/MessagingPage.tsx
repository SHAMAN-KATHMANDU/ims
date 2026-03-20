"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";
import { useMessagingSocket } from "../hooks/use-messaging-socket";
import { useMessagingChannels } from "../hooks/use-messaging-channels";
import { ConversationList } from "./ConversationList";
import { ChatPanel } from "./ChatPanel";
import { ManualConnectDialog } from "./ManualConnectDialog";
import { Button } from "@/components/ui/button";

const isDevRuntime = process.env.NODE_ENV === "development";

export function MessagingPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [resumeChannelId, setResumeChannelId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const { data: channels = [], isLoading: channelsLoading } =
    useMessagingChannels({
      enabled: isDevRuntime,
    });

  // Establish socket connection for real-time updates
  useMessagingSocket();

  const pendingManualSetup = channels.find(
    (c) =>
      c.status === "PENDING" &&
      c.provider === "FACEBOOK_MESSENGER" &&
      (c.externalId == null || c.externalId === ""),
  );

  const showDevConnect =
    isDevRuntime &&
    !channelsLoading &&
    (channels.length === 0 || pendingManualSetup != null);

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
            "flex h-full w-full min-h-0 shrink-0 flex-col border-r sm:w-80",
            isMobile && selectedId && "hidden",
          )}
        >
          {showDevConnect && (
            <div className="flex shrink-0 items-center justify-end border-b px-3 py-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setResumeChannelId(pendingManualSetup?.id ?? null);
                  setConnectOpen(true);
                }}
              >
                {pendingManualSetup ? "Complete Messenger setup" : "Connect"}
              </Button>
            </div>
          )}
          <div className="min-h-0 flex-1">
            <ConversationList
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
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

      <ManualConnectDialog
        open={connectOpen}
        onOpenChange={(o) => {
          if (!o) setResumeChannelId(null);
          setConnectOpen(o);
        }}
        resumeChannelId={resumeChannelId}
      />
    </>
  );
}
