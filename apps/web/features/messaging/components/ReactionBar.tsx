"use client";

import { useState } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useTheme } from "next-themes";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Preset quick reactions (thumbs up, heart, laugh, surprised, sad, thumbs down). */
export const QUICK_REACTION_EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "👎",
] as const;

interface ReactionBarProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ReactionBar({
  onSelect,
  disabled,
  className,
}: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const pickerTheme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full border bg-background/95 px-1 py-0.5 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      {QUICK_REACTION_EMOJIS.map((emoji) => (
        <Button
          key={emoji}
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8 shrink-0 text-base"
          disabled={disabled}
          aria-label={`React with ${emoji}`}
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </Button>
      ))}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-8 shrink-0"
            disabled={disabled}
            aria-label="More emojis"
          >
            <Plus className="size-4" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto border-0 p-0 shadow-lg" align="start">
          <Picker
            data={data}
            theme={pickerTheme}
            onEmojiSelect={(e: { native: string }) => {
              onSelect(e.native);
              setPickerOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
