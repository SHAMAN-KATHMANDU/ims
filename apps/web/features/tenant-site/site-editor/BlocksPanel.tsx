"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, Plus, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { BLOCK_CATALOG } from "./block-catalog";
import { BlockThumbnail, getBlockIcon } from "./BlockThumbnail";

// ---------------------------------------------------------------------------
// Recent-blocks persistence helpers (exported for SiteEditorPage.handleAddBlock)
// ---------------------------------------------------------------------------

const RECENT_BLOCKS_KEY = "site-editor-recent-blocks";
const RECENT_BLOCKS_MAX = 6;

export function loadRecentBlocks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_BLOCKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export function pushRecentBlock(kind: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadRecentBlocks().filter((k) => k !== kind);
    const next = [kind, ...current].slice(0, RECENT_BLOCKS_MAX);
    localStorage.setItem(RECENT_BLOCKS_KEY, JSON.stringify(next));
  } catch {
    // non-critical
  }
}

const BLOCK_GROUPS = [
  "All",
  "Layout",
  "Content",
  "Commerce",
  "Marketing",
  "Blog",
  "PDP",
  "Form",
  "Header",
  "Footer",
];

// ---------------------------------------------------------------------------
// BlockDragChip — offscreen ghost shown during palette drag
// ---------------------------------------------------------------------------

export function BlockDragChip({
  chipRef,
}: {
  chipRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={chipRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-[-9999px] flex items-center gap-2 h-9 pr-3 pl-2 rounded-md border border-primary/60 bg-card shadow-lg z-[200]"
    >
      <div className="h-6 w-6 rounded bg-primary/15 grid place-items-center text-primary">
        <Plus size={13} />
      </div>
      <span className="text-[12.5px] font-semibold text-foreground whitespace-nowrap">
        Block
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BlockCatalogCard — individual card in the blocks palette
// ---------------------------------------------------------------------------

function BlockCatalogCard({
  entry,
  onAdd,
  dragChipRef,
}: {
  entry: (typeof BLOCK_CATALOG)[number];
  onAdd: (kind: string) => void;
  dragChipRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const Icon = getBlockIcon(entry.kind);
  return (
    <button
      onClick={() => onAdd(entry.kind)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("block-kind", entry.kind);
        e.dataTransfer.effectAllowed = "copy";
        const chip = dragChipRef?.current;
        if (chip) {
          const span = chip.querySelector("span");
          if (span) span.textContent = entry.label;
          try {
            e.dataTransfer.setDragImage(chip, 24, 16);
          } catch {
            // setDragImage unsupported — fall back to default preview
          }
        }
      }}
      className="group relative flex flex-col gap-1.5 p-1.5 rounded-md border border-border bg-card hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 text-left transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <BlockThumbnail kind={entry.kind} />
      <div className="px-0.5 pb-0.5 flex items-start gap-1.5">
        <div className="h-5 w-5 shrink-0 rounded bg-muted grid place-items-center text-muted-foreground group-hover:text-primary transition-colors">
          <Icon size={11} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-semibold text-foreground leading-tight truncate">
            {entry.label}
          </div>
          <div className="text-[9.5px] text-muted-foreground/60 leading-tight mt-0.5 line-clamp-1">
            {entry.description}
          </div>
        </div>
        <Plus
          size={11}
          className="text-muted-foreground/60 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// BlocksPanel — the "Add blocks" sidebar panel
// ---------------------------------------------------------------------------

export function BlocksPanel({
  onAdd,
  dragChipRef,
}: {
  onAdd: (kind: string) => void;
  dragChipRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("All");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(loadRecentBlocks());
  }, []);

  const handleAdd = useCallback(
    (kind: string) => {
      pushRecentBlock(kind);
      setRecent(loadRecentBlocks());
      onAdd(kind);
    },
    [onAdd],
  );

  const filtered = BLOCK_CATALOG.filter(
    (b) =>
      (group === "All" || b.category.toLowerCase() === group.toLowerCase()) &&
      (q === "" ||
        b.label.toLowerCase().includes(q.toLowerCase()) ||
        b.description.toLowerCase().includes(q.toLowerCase())),
  );

  const recentEntries =
    group === "All" && q === ""
      ? recent
          .map((kind) => BLOCK_CATALOG.find((b) => b.kind === kind))
          .filter((x): x is (typeof BLOCK_CATALOG)[number] => !!x)
          .slice(0, RECENT_BLOCKS_MAX)
      : [];

  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground">
          Add blocks
        </span>
      </div>
      <div className="px-3 pt-2.5 pb-2 flex flex-col gap-2 shrink-0">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/60"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search 60+ blocks…"
            className="w-full h-7 pl-7 pr-2.5 rounded-md border border-border bg-muted/50 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {BLOCK_GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={cn(
                "h-6 px-2 rounded-full text-[11px] font-medium transition-colors",
                group === g
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
        {recentEntries.length > 0 && (
          <section>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1.5 flex items-center gap-1">
              <History size={10} />
              Recently used
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {recentEntries.map((b) => (
                <BlockCatalogCard
                  key={`recent-${b.kind}`}
                  entry={b}
                  onAdd={handleAdd}
                  dragChipRef={dragChipRef}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          {recentEntries.length > 0 && (
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1.5">
              All blocks
            </div>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            {filtered.map((b) => (
              <BlockCatalogCard
                key={b.kind}
                entry={b}
                onAdd={handleAdd}
                dragChipRef={dragChipRef}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-[12px] text-muted-foreground/60">
              No blocks match.
            </div>
          )}
        </section>
      </div>
      <div className="border-t border-border px-3 py-2 flex items-center justify-between text-[10.5px] text-muted-foreground/60 shrink-0">
        <span>{filtered.length} blocks</span>
        <span className="font-mono">Drag or click</span>
      </div>
    </div>
  );
}
