"use client";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useTheme } from "next-themes";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { QUICK_REACTION_EMOJIS } from "./ReactionBar";

interface MessageContextMenuProps {
  children: React.ReactNode;
  onReply: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onReact: (emoji: string) => void;
  canCopy: boolean;
  canEdit: boolean;
}

export function MessageContextMenu({
  children,
  onReply,
  onCopy,
  onEdit,
  onReact,
  canCopy,
  canEdit,
}: MessageContextMenuProps) {
  const { resolvedTheme } = useTheme();
  const pickerTheme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={onReply}>Reply</ContextMenuItem>
        {canCopy ? (
          <ContextMenuItem onSelect={onCopy}>Copy message</ContextMenuItem>
        ) : null}
        {canEdit ? (
          <ContextMenuItem onSelect={onEdit}>Edit message</ContextMenuItem>
        ) : null}
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>React</ContextMenuSubTrigger>
          <ContextMenuSubContent className="max-h-[min(24rem,70vh)] w-auto overflow-y-auto p-2">
            <div className="mb-2 flex flex-wrap gap-1">
              {QUICK_REACTION_EMOJIS.map((emoji) => (
                <ContextMenuItem
                  key={emoji}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-md p-0 text-lg"
                  onSelect={() => onReact(emoji)}
                >
                  {emoji}
                </ContextMenuItem>
              ))}
            </div>
            <Picker
              data={data}
              theme={pickerTheme}
              onEmojiSelect={(e: { native: string }) => onReact(e.native)}
            />
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
}
