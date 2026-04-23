"use client";

import { X } from "lucide-react";

export function ShortcutsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  const rows: [string, string][] = [
    ["⌘K", "Quick-add block"],
    ["⌘S", "Save draft"],
    ["⌘↵", "Publish"],
    ["⌘Z", "Undo"],
    ["⌘⇧Z", "Redo"],
    ["Del", "Delete selected block"],
    ["⌘D", "Duplicate selected block"],
    ["Esc", "Deselect"],
    ["1–8", "Switch panel"],
    ["?", "This panel"],
  ];
  return (
    <div
      className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-sm grid place-items-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl shadow-2xl w-[400px] border border-border animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-11 px-4 flex items-center justify-between border-b border-border">
          <div className="text-[13px] font-semibold text-foreground">
            Keyboard shortcuts
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 grid place-items-center rounded text-muted-foreground/60 hover:bg-muted"
          >
            <X size={13} />
          </button>
        </div>
        <div className="p-4 flex flex-col gap-1">
          {rows.map(([k, label]) => (
            <div
              key={label}
              className="flex items-center justify-between h-7 text-[12.5px]"
            >
              <span className="text-muted-foreground">{label}</span>
              <kbd className="text-[11px] px-1.5 py-0.5 rounded border border-border border-b-2 bg-card text-muted-foreground font-mono">
                {k}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
