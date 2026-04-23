"use client";

/**
 * EmptyCanvas — shown in the canvas area when the current layout has no blocks.
 */

import { Box, Plus, Search } from "lucide-react";
import { ACCENT } from "./editor-config";
import type { PanelId } from "./types";

export function EmptyCanvas({
  scopeLabel,
  setActivePanel,
  setQuickAddOpen,
}: {
  scopeLabel: string;
  setActivePanel: (p: PanelId) => void;
  setQuickAddOpen: (open: boolean) => void;
}) {
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- canvas stopPropagation guard; not a focusable target
    <div
      className="py-24 px-8 text-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative mx-auto mb-4 h-16 w-16">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 blur-lg" />
        <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 border border-border grid place-items-center">
          <Box size={26} className="text-muted-foreground/60" />
        </div>
      </div>
      <div className="text-[15px] font-semibold text-foreground mb-1">
        Empty {scopeLabel.toLowerCase()}
      </div>
      <div className="text-[12.5px] text-muted-foreground/80 mb-5 max-w-[320px] mx-auto">
        Drag blocks from the panel, or press{" "}
        <kbd className="text-[11px] px-1.5 py-0.5 rounded border border-border bg-card font-mono">
          ⌘K
        </kbd>{" "}
        to search the catalog.
      </div>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setActivePanel("blocks");
          }}
          className="h-8 px-3.5 rounded-md text-[12.5px] font-semibold text-white flex items-center gap-1.5"
          style={{ background: ACCENT }}
        >
          <Plus size={12} />
          Add block
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setQuickAddOpen(true);
          }}
          className="h-8 px-3 rounded-md border border-border text-[12px] font-medium text-foreground/80 hover:bg-muted/50 flex items-center gap-1.5"
        >
          <Search size={12} />
          Quick add
        </button>
      </div>
    </div>
  );
}
