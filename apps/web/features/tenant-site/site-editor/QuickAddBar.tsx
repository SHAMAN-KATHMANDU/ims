"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Box } from "lucide-react";
import type { SiteLayoutScope } from "@repo/shared";
import { cn } from "@/lib/utils";
import { BLOCK_CATALOG } from "./block-catalog";

export function QuickAddBar({
  open,
  onClose,
  onAdd,
  scope: _scope,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (kind: string) => void;
  scope: SiteLayoutScope;
}) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 40);
      setQ("");
      setIdx(0);
    }
  }, [open]);

  const results = useMemo(
    () =>
      BLOCK_CATALOG.filter((b) => {
        if (q === "") return true;
        return (
          b.label.toLowerCase().includes(q.toLowerCase()) ||
          b.description.toLowerCase().includes(q.toLowerCase()) ||
          b.category.toLowerCase().includes(q.toLowerCase())
        );
      }).slice(0, 8),
    [q],
  );

  if (!open) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- modal backdrop click-to-close; Escape key handled via onClose prop
    <div
      className="fixed inset-0 z-[100] bg-foreground/20 backdrop-blur-sm flex items-start justify-center pt-24 animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- stopPropagation to prevent backdrop close */}
      <div
        className="bg-card rounded-xl shadow-2xl w-[520px] overflow-hidden border border-border animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 h-12 border-b border-border">
          <Search size={14} className="text-muted-foreground/60 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIdx((i) => Math.min(i + 1, results.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIdx((i) => Math.max(i - 1, 0));
              }
              if (e.key === "Enter") {
                e.preventDefault();
                const r = results[idx];
                if (r) {
                  onAdd(r.kind);
                  onClose();
                }
              }
            }}
            placeholder="Add a block… (hero, product grid, heading)"
            className="flex-1 bg-transparent focus:outline-none text-[14px] text-foreground placeholder:text-muted-foreground/60"
          />
          <kbd className="text-[10.5px] px-1.5 py-0.5 rounded border border-border bg-muted/50 text-muted-foreground font-mono">
            ESC
          </kbd>
        </div>
        <div className="max-h-[360px] overflow-y-auto py-1">
          {results.map((b, i) => (
            <button
              key={b.kind}
              onClick={() => {
                onAdd(b.kind);
                onClose();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 h-12 text-left transition-colors",
                i === idx ? "bg-muted/50" : "hover:bg-muted/50",
              )}
            >
              <div className="h-7 w-7 rounded bg-muted grid place-items-center shrink-0 text-muted-foreground">
                <Box size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-foreground leading-tight">
                  {b.label}
                </div>
                <div className="text-[11px] text-muted-foreground truncate leading-tight">
                  {b.description}
                </div>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/60 uppercase">
                {b.category}
              </span>
              {i === idx && (
                <kbd className="text-[10px] px-1 py-0.5 rounded border border-border bg-muted/50 text-muted-foreground font-mono">
                  ↵
                </kbd>
              )}
            </button>
          ))}
          {results.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground/60">
              No blocks match.
            </div>
          )}
        </div>
        <div className="border-t border-border px-4 py-2 flex items-center justify-between text-[10.5px] text-muted-foreground/60 bg-muted/50">
          <span className="flex items-center gap-3">
            <span>
              <kbd className="text-[10px] px-1 py-0.5 rounded border border-border bg-card font-mono">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
            <span>
              <kbd className="text-[10px] px-1 py-0.5 rounded border border-border bg-card font-mono">
                ↵
              </kbd>{" "}
              Insert
            </span>
          </span>
          <span>
            {results.length} of {BLOCK_CATALOG.length}
          </span>
        </div>
      </div>
    </div>
  );
}
