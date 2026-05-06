"use client";

/**
 * ContentBlockPalette — popover that lets the author pick a block kind
 * to insert at a specific index in the content body.
 *
 * Backed by `listContentBodyCatalog()` so the palette only shows kinds
 * appropriate for blog/page bodies. Search filters across kind / label /
 * description; the result list groups by `category`.
 *
 * The popover is fully controlled by its parent — `<ContentBlockEditor>`
 * mounts one instance per "+ Add block" slot and toggles `open` based on
 * which slot was clicked.
 */

import { useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import type { CatalogEntry } from "@repo/shared";
import { listContentBodyCatalog } from "../lib/content-block-kinds";

interface Props {
  /** Called when the author picks a kind. Closes the popover. */
  onPick: (entry: CatalogEntry) => void;
  /** Optional label override on the trigger. */
  label?: string;
  /** Visually compact trigger (used between rows). */
  compact?: boolean;
  disabled?: boolean;
}

export function ContentBlockPalette({
  onPick,
  label = "Add block",
  compact,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const all = listContentBodyCatalog();
    const q = query.trim().toLowerCase();
    const filtered = q
      ? all.filter(
          (e) =>
            e.kind.toLowerCase().includes(q) ||
            e.label.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q),
        )
      : all;
    const byCategory = new Map<string, CatalogEntry[]>();
    for (const entry of filtered) {
      const list = byCategory.get(entry.category) ?? [];
      list.push(entry);
      byCategory.set(entry.category, list);
    }
    return Array.from(byCategory.entries()); // ordered by first occurrence
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        className={
          compact
            ? "group inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-md hover:border-primary/50 transition-colors disabled:opacity-50"
            : "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted/40 transition-colors disabled:opacity-50"
        }
        aria-label={label}
      >
        <Plus className={compact ? "h-3 w-3" : "h-4 w-4"} aria-hidden="true" />
        <span>{label}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0" sideOffset={6}>
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60"
              aria-hidden="true"
            />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search blocks…"
              className="pl-8 h-8"
              aria-label="Search blocks"
            />
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-2 space-y-3">
          {groups.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              No blocks match.
            </p>
          )}
          {groups.map(([category, entries]) => (
            <section key={category} className="space-y-1">
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 px-2">
                {category}
              </h3>
              <div className="flex flex-col gap-0.5">
                {entries.map((entry) => (
                  <button
                    key={entry.kind}
                    type="button"
                    onClick={() => {
                      onPick(entry);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="text-left px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
                  >
                    <div className="text-sm font-medium">{entry.label}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1">
                      {entry.description}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
