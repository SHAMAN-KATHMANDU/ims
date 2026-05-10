"use client";

import type React from "react";
import { useState, useMemo, Suspense } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getBlockCatalog,
  getCategories,
} from "../services/blocks-library.service";
import { InsertBlockDialog } from "./InsertBlockDialog";
import type { CatalogEntry } from "@repo/shared";
import { BlockRenderer, MOCK_DATA_CONTEXT } from "@repo/blocks";

function BlockPreviewFallback() {
  return (
    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
      Preview unavailable
    </div>
  );
}

export function BlocksLibraryView() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBlock, setSelectedBlock] = useState<CatalogEntry | null>(null);
  const [insertingBlock, setInsertingBlock] = useState<CatalogEntry | null>(
    null,
  );

  const allBlocks = getBlockCatalog();
  const categories = getCategories();

  const filteredBlocks = useMemo(() => {
    return allBlocks.filter((block) => {
      const matchesSearch =
        !search ||
        block.label.toLowerCase().includes(search.toLowerCase()) ||
        (block.description?.toLowerCase().includes(search.toLowerCase()) ??
          false);
      const matchesCategory =
        selectedCategory === "all" || block.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory, allBlocks]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blocks Library"
        description="Browse and insert reusable block components."
      />

      <div className="space-y-4">
        {/* Search & Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search blocks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="text-xs text-muted-foreground">
          {filteredBlocks.length} block{filteredBlocks.length !== 1 ? "s" : ""}{" "}
          found
        </div>

        {/* Grid */}
        {filteredBlocks.length === 0 ? (
          <div className="flex items-center justify-center h-48 rounded-lg border border-dashed border-border">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No blocks found</p>
              <p className="text-xs mt-1">Try adjusting your search</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredBlocks.map((block) => (
              <BlockCard
                key={block.kind}
                block={block}
                onSelect={() => setSelectedBlock(block)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Block Detail Dialog */}
      {selectedBlock && (
        <BlockDetailDialog
          block={selectedBlock}
          onClose={() => setSelectedBlock(null)}
          onInsert={() => {
            setInsertingBlock(selectedBlock);
            setSelectedBlock(null);
          }}
        />
      )}

      {/* Insert Block Dialog */}
      {insertingBlock && (
        <InsertBlockDialog
          block={insertingBlock}
          onClose={() => setInsertingBlock(null)}
        />
      )}
    </div>
  );
}

function BlockCard({
  block,
  onSelect,
}: {
  block: CatalogEntry;
  onSelect: () => void;
}): React.ReactElement {
  const defaultProps = block.createDefaultProps();
  const previewNode = {
    id: "preview",
    kind: block.kind,
    props: defaultProps,
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Insert ${block.label} block`}
      className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left space-y-2 group cursor-pointer"
    >
      {/*
        Block renderers were authored against a light canvas (white bg, dark
        text). The library card sat on `bg-muted` which on dark theme is a
        dark grey — most renderers' default copy/illustrations were
        invisible. Force a light surface (with the `light` class so any
        Tailwind dark-mode tokens inside the renderer resolve to the light
        palette) and constrain the block to a tile with a top-left scale
        so the user sees the same first 200% of the rendered block.
      */}
      <div className="h-24 bg-white rounded border border-border/40 overflow-hidden relative light">
        <div
          className="pointer-events-none absolute inset-0 origin-top-left scale-50"
          style={{ width: "200%", height: "200%", color: "#1a1a1a" }}
        >
          <Suspense fallback={<BlockPreviewFallback />}>
            <BlockRenderer
              nodes={[previewNode]}
              dataContext={MOCK_DATA_CONTEXT}
            />
          </Suspense>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="font-medium text-sm line-clamp-2">{block.label}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {block.description || "No description"}
        </p>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          {block.category || "other"}
        </span>
      </div>
    </button>
  );
}

interface BlockDetailDialogProps {
  block: CatalogEntry;
  onClose: () => void;
  onInsert: () => void;
}

function BlockDetailDialog({
  block,
  onClose,
  onInsert,
}: BlockDetailDialogProps): React.ReactElement {
  const defaultProps = block.createDefaultProps();
  const previewNode = {
    id: "detail-preview",
    kind: block.kind,
    props: defaultProps,
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{block.label}</DialogTitle>
          <DialogDescription>{block.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview — light surface so block renderers' default light-mode
              styling actually shows. */}
          <div
            className="h-48 bg-white rounded-lg border border-border overflow-auto light"
            style={{ color: "#1a1a1a" }}
          >
            <Suspense fallback={<BlockPreviewFallback />}>
              <BlockRenderer
                nodes={[previewNode]}
                dataContext={MOCK_DATA_CONTEXT}
              />
            </Suspense>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Category:</span>
              <span className="ml-2 font-mono text-xs bg-muted px-2 py-1 rounded">
                {block.category || "other"}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground">Block kind:</span>
              <span className="ml-2 font-mono text-xs bg-muted px-2 py-1 rounded">
                {block.kind}
              </span>
            </div>

            {block.scopes && (
              <div>
                <span className="text-muted-foreground">Available on:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {block.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="text-xs bg-muted px-2 py-1 rounded"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button size="sm" onClick={onInsert}>
              Insert into page
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
