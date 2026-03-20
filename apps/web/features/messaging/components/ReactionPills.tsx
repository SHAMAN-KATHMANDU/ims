"use client";

import { cn } from "@/lib/utils";
import type { MessageReaction } from "../services/messaging.service";

export interface ReactionGroup {
  emoji: string;
  count: number;
  userReacted: boolean;
}

/** Merge visually identical emoji (variation selectors / normalization). */
function reactionGroupKey(emoji: string): string {
  return emoji.normalize("NFC").replace(/\uFE0F/g, "");
}

function groupReactions(
  reactions: MessageReaction[] | undefined,
  currentUserId: string,
): ReactionGroup[] {
  if (!reactions?.length) return [];
  const map = new Map<
    string,
    { displayEmoji: string; count: number; userReacted: boolean }
  >();
  for (const r of reactions) {
    const key = reactionGroupKey(r.emoji);
    const cur = map.get(key) ?? {
      displayEmoji: r.emoji,
      count: 0,
      userReacted: false,
    };
    cur.count += 1;
    if (r.userId === currentUserId) cur.userReacted = true;
    map.set(key, cur);
  }
  return [...map.entries()].map(([, v]) => ({
    emoji: v.displayEmoji,
    count: v.count,
    userReacted: v.userReacted,
  }));
}

interface ReactionPillsProps {
  reactions: MessageReaction[] | undefined;
  currentUserId: string;
  isOutbound: boolean;
  onToggle: (emoji: string) => void;
  disabled?: boolean;
}

export function ReactionPills({
  reactions,
  currentUserId,
  isOutbound,
  onToggle,
  disabled,
}: ReactionPillsProps) {
  const groups = groupReactions(reactions, currentUserId);
  if (groups.length === 0) return null;

  return (
    <div
      className={cn(
        "mt-1 flex max-w-[min(100%,36rem)] flex-nowrap gap-1 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        isOutbound ? "justify-end" : "justify-start",
      )}
    >
      {groups.map((g) => (
        <button
          key={reactionGroupKey(g.emoji)}
          type="button"
          disabled={disabled}
          onClick={() => onToggle(g.emoji)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
            g.userReacted
              ? "border-primary bg-primary/15"
              : "border-border bg-background/80 hover:bg-muted",
          )}
        >
          <span aria-hidden>{g.emoji}</span>
          <span className="tabular-nums text-muted-foreground">{g.count}</span>
        </button>
      ))}
    </div>
  );
}
