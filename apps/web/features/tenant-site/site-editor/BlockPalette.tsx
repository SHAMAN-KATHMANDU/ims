"use client";

/**
 * BlockPalette — modal that lists available blocks and inserts them into
 * the current scope's tree when clicked.
 */

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { SiteLayoutScope } from "@repo/shared";
import { useEditorStore } from "./editor-store";
import {
  BLOCK_CATALOG,
  createBlockFromCatalog,
  type CatalogCategory,
  type CatalogEntry,
} from "./block-catalog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: SiteLayoutScope;
};

const CATEGORY_ORDER: CatalogCategory[] = [
  "layout",
  "content",
  "commerce",
  "marketing",
  "blog",
  "pdp",
];

const CATEGORY_LABEL: Record<CatalogCategory, string> = {
  layout: "Layout",
  content: "Content",
  commerce: "Commerce",
  marketing: "Marketing",
  blog: "Blog",
  pdp: "Product detail",
};

export function BlockPalette({ open, onOpenChange, scope }: Props) {
  const addBlock = useEditorStore((s) => s.addBlock);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return BLOCK_CATALOG.filter((entry) => {
      // Filter by scope: blocks with no `scopes` array work everywhere;
      // blocks that list scopes must include the current one.
      if (entry.scopes && !entry.scopes.includes(scope as "home")) return false;
      if (!q) return true;
      return (
        entry.label.toLowerCase().includes(q) ||
        entry.kind.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q)
      );
    });
  }, [filter, scope]);

  const grouped = useMemo(() => {
    const m = new Map<CatalogCategory, CatalogEntry[]>();
    for (const entry of filtered) {
      const list = m.get(entry.category) ?? [];
      list.push(entry);
      m.set(entry.category, list);
    }
    return m;
  }, [filtered]);

  const handleInsert = (entry: CatalogEntry) => {
    const block = createBlockFromCatalog(entry);
    addBlock(block);
    onOpenChange(false);
    setFilter("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add a block</DialogTitle>
          <DialogDescription>
            Blocks are inserted at the bottom of the current scope. You can
            reorder after.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search blocks…"
          autoFocus
        />
        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {CATEGORY_ORDER.map((cat) => {
            const entries = grouped.get(cat);
            if (!entries || entries.length === 0) return null;
            return (
              <div key={cat}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {CATEGORY_LABEL[cat]}
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {entries.map((entry) => (
                    <button
                      key={entry.kind}
                      type="button"
                      onClick={() => handleInsert(entry)}
                      className="rounded-md border border-border p-3 text-left transition hover:border-primary hover:bg-primary/5"
                    >
                      <div className="text-sm font-medium">{entry.label}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {entry.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No blocks match your search.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
