"use client";

import { cn } from "@/lib/utils";
import type { MessageReaction } from "../services/messaging.service";

export interface ReactionGroup {
  emoji: string;
  count: number;
  userReacted: boolean;
}

function groupReactions(
  reactions: MessageReaction[] | undefined,
  currentUserId: string,
): ReactionGroup[] {
  if (!reactions?.length) return [];
  const map = new Map<string, { count: number; userReacted: boolean }>();
  for (const r of reactions) {
    const cur = map.get(r.emoji) ?? { count: 0, userReacted: false };
    cur.count += 1;
    if (r.userId === currentUserId) cur.userReacted = true;
    map.set(r.emoji, cur);
  }
  return [...map.entries()].map(([emoji, v]) => ({
    emoji,
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
        "mt-1 flex max-w-[min(75%,36rem)] flex-wrap gap-1",
        isOutbound ? "justify-end" : "justify-start",
      )}
    >
      {groups.map((g) => (
        <button
          key={g.emoji}
          type="button"
          disabled={disabled}
          onClick={() => onToggle(g.emoji)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
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
