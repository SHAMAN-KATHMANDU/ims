"use client";

import { X, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT = "oklch(0.62 0.08 150)";

export function PublishModal({
  open,
  onClose,
  onConfirm,
  dirty,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  dirty: boolean;
  isPending: boolean;
}) {
  if (!open) return null;
  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- modal backdrop click-to-close; Escape key handled via onClose prop
    <div
      className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-sm grid place-items-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- stopPropagation to prevent backdrop close */}
      <div
        className="bg-card rounded-xl shadow-2xl w-[480px] overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 grid place-items-center shrink-0">
            <Rocket size={18} className="text-emerald-700" />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-foreground mb-0.5">
              {isPending ? "Publishing…" : "Publish to live?"}
            </div>
            <div className="text-[12.5px] text-muted-foreground">
              {isPending
                ? "Pushing changes to your live site…"
                : "All draft changes will become visible to your customers."}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 grid place-items-center rounded text-muted-foreground/60 hover:bg-muted"
          >
            <X size={13} />
          </button>
        </div>
        <div className="p-5 bg-muted/50 flex flex-col gap-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Draft status</span>
            <span className="font-mono text-foreground">
              {dirty ? "Unsaved changes" : "Up to date"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Build</span>
            <span className="font-mono text-foreground">static · ISR</span>
          </div>
        </div>
        <div className="p-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-md border border-border text-[12.5px] font-medium text-foreground/80 hover:bg-muted/50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              "h-8 px-3.5 rounded-md text-[12.5px] font-semibold text-white flex items-center gap-1.5 disabled:opacity-60",
            )}
            style={{ background: ACCENT }}
          >
            <Rocket size={12} />
            {isPending ? "Publishing…" : "Publish now"}
          </button>
        </div>
      </div>
    </div>
  );
}
