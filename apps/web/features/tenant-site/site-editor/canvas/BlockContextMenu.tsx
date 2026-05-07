"use client";

/**
 * Right-click block context menu.
 *
 * Restored from `git show ef9de618:apps/web/features/tenant-site/site-editor/BlockContextMenu.tsx`
 * with imports updated to the rebuild's new module paths
 * (`./store/editor-store` for the hook, named `select*` selectors for
 * each mutation). Behaviour: Move up / Move down / Duplicate / Copy
 * styles / Paste styles / Delete. Style clipboard is an in-memory
 * singleton — survives the editor session, cleared on reload.
 */

import { useState, useEffect } from "react";
import {
  ChevronUp,
  ChevronDown,
  Copy,
  Palette,
  ClipboardList,
  Trash2,
} from "lucide-react";
import type { BlockNode, BlockStyleOverride } from "@repo/shared";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import {
  useEditorStore,
  selectDuplicateBlock,
  selectMoveBlock,
  selectRemoveBlock,
  selectUpdateBlockStyle,
} from "../store/editor-store";

// ---------------------------------------------------------------------------
// In-memory style clipboard — survives the editor session, cleared on reload.
// ---------------------------------------------------------------------------

let styleClipboard: BlockStyleOverride | null = null;
const styleClipboardListeners = new Set<() => void>();

export function setStyleClipboard(style: BlockStyleOverride | null): void {
  styleClipboard = style;
  styleClipboardListeners.forEach((cb) => cb());
}

export function useStyleClipboard(): BlockStyleOverride | null {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = (): void => force((x) => x + 1);
    styleClipboardListeners.add(cb);
    return () => {
      styleClipboardListeners.delete(cb);
    };
  }, []);
  return styleClipboard;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BlockMenuState = {
  blockId: string;
  x: number;
  y: number;
} | null;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BlockMenuItem({
  icon: Icon,
  label,
  kbd,
  disabled,
  destructive,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  kbd?: string;
  disabled?: boolean;
  destructive?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2.5 h-7 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground/90 hover:bg-muted",
      )}
    >
      <Icon
        size={12}
        className={cn(
          destructive ? "text-destructive" : "text-muted-foreground",
        )}
      />
      <span className="flex-1">{label}</span>
      {kbd && (
        <kbd className="text-[10px] font-mono text-muted-foreground/60">
          {kbd}
        </kbd>
      )}
    </button>
  );
}

function BlockMenuDivider() {
  return <div className="h-px bg-border my-0.5" />;
}

// ---------------------------------------------------------------------------
// BlockContextMenu
// ---------------------------------------------------------------------------

export function BlockContextMenu({
  state,
  blocks,
  onClose,
}: {
  state: BlockMenuState;
  blocks: BlockNode[];
  onClose: () => void;
}) {
  const moveBlock = useEditorStore(selectMoveBlock);
  const duplicateBlock = useEditorStore(selectDuplicateBlock);
  const removeBlock = useEditorStore(selectRemoveBlock);
  const updateBlockStyle = useEditorStore(selectUpdateBlockStyle);
  const clipboard = useStyleClipboard();
  const { toast } = useToast();

  useEffect(() => {
    if (!state) return;
    const onDocClick = (): void => onClose();
    const onEsc = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    // Defer registration so the click that opened the menu doesn't immediately close it.
    const t = window.setTimeout(() => {
      document.addEventListener("click", onDocClick);
      document.addEventListener("keydown", onEsc);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [state, onClose]);

  if (!state) return null;
  const idx = blocks.findIndex((b) => b.id === state.blockId);
  if (idx < 0) return null;
  const block = blocks[idx];
  if (!block) return null;
  const canUp = idx > 0;
  const canDown = idx < blocks.length - 1;

  const handle = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
    onClose();
  };

  const MENU_W = 210;
  const MENU_H = 280;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.min(state.x, vw - MENU_W - 8);
  const top = Math.min(state.y, vh - MENU_H - 8);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- context menu rendered at pointer position; document-level Escape handler closes it
    <div
      role="menu"
      className="fixed z-[110] min-w-[200px] rounded-md border border-border bg-card shadow-xl py-1 text-[12.5px] animate-in fade-in zoom-in-95 duration-100"
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <BlockMenuItem
        icon={ChevronUp}
        label="Move up"
        disabled={!canUp}
        onClick={handle(() => moveBlock(state.blockId, -1))}
      />
      <BlockMenuItem
        icon={ChevronDown}
        label="Move down"
        disabled={!canDown}
        onClick={handle(() => moveBlock(state.blockId, 1))}
      />
      <BlockMenuItem
        icon={Copy}
        label="Duplicate"
        kbd="⌘D"
        onClick={handle(() => duplicateBlock(state.blockId))}
      />
      <BlockMenuDivider />
      <BlockMenuItem
        icon={Palette}
        label="Copy styles"
        onClick={handle(() => {
          setStyleClipboard(block.style ?? {});
          toast({ title: "Styles copied" });
        })}
      />
      <BlockMenuItem
        icon={ClipboardList}
        label={clipboard ? "Paste styles" : "Paste styles (empty)"}
        disabled={!clipboard}
        onClick={handle(() => {
          if (!clipboard) return;
          updateBlockStyle(state.blockId, clipboard);
          toast({ title: "Styles pasted" });
        })}
      />
      <BlockMenuDivider />
      <BlockMenuItem
        icon={Trash2}
        label="Delete"
        kbd="⌫"
        destructive
        onClick={handle(() => removeBlock(state.blockId))}
      />
    </div>
  );
}
