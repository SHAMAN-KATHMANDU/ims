"use client";

import type { JSX } from "react";
import type { BlockNode } from "@repo/shared";
import { BLOCK_CATALOG_ENTRIES } from "@repo/shared";
import { Search, Plus, GripVertical } from "lucide-react";

interface BuilderLayersProps {
  blocks: BlockNode[];
  selectedId: string | null;
  draggingId: string | null;
  dropAt: number | null;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (index: number) => void;
  onDrop: (fromId: string, toIndex: number) => void;
}

function getBlockLabel(block: BlockNode): string {
  const catalog = BLOCK_CATALOG_ENTRIES.find((e) => e.kind === block.kind);
  const label = catalog?.label || block.kind;

  // Add preview text for blocks that have text content
  if (block.kind === "heading") {
    const props = block.props as Record<string, unknown>;
    const text = (props.text as string) || "";
    return `${label} · ${text.slice(0, 30)}`;
  }
  if (block.kind === "rich-text") {
    const props = block.props as Record<string, unknown>;
    const text = (props.text as string) || "";
    return text.slice(0, 30) || label;
  }

  return label;
}

function getBlockIcon(kind: string): string {
  const iconMap: Record<string, string> = {
    section: "⬜",
    row: "↔️",
    columns: "⚬",
    "css-grid": "⊞",
    heading: "T",
    "rich-text": "¶",
    image: "🖼",
    button: "◉",
    "markdown-body": "≡",
    embed: "⬙",
    video: "▶",
    accordion: "▼",
    gallery: "◻◻",
    tabs: "≣",
    "custom-html": "<>",
    "empty-state": "∅",
    hero: "△",
    "product-grid": "⊡",
    "category-tiles": "⊞",
    "product-listing": "≡",
    "product-filters": "⊕",
    "bundle-spotlight": "◆",
    "gift-card-redeem": "🎁",
    "collection-cards": "⬚",
    "announcement-bar": "!!",
    "trust-strip": "✓",
    "story-split": "◐",
    "bento-showcase": "⊞",
    "stats-band": "▌",
    newsletter: "✉",
    divider: "―",
    spacer: "─",
  };
  return iconMap[kind] || "⬜";
}

export function BuilderLayers({
  blocks,
  selectedId,
  draggingId,
  dropAt,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: BuilderLayersProps): JSX.Element {
  return (
    <aside
      style={{
        width: 240,
        borderRight: "1px solid var(--line)",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 10.5,
            color: "var(--ink-4)",
            letterSpacing: 0.5,
            textTransform: "uppercase",
            flex: 1,
          }}
        >
          Layers
        </span>
        <button
          title="Search layers"
          style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            color: "var(--ink-4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Search size={12} />
        </button>
        <button
          title="Add block"
          style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            color: "var(--ink-4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Layers list */}
      <div
        style={{
          padding: "6px 4px",
          flex: 1,
          overflow: "auto",
        }}
      >
        {blocks.map((block, index) => {
          const isSelected = selectedId === block.id;
          const isDragging = draggingId === block.id;
          const showDropIndicator = dropAt === index;

          return (
            <div key={block.id}>
              {showDropIndicator && (
                <div
                  style={{
                    height: 2,
                    background: "var(--accent)",
                    margin: "0 6px",
                    borderRadius: 2,
                  }}
                />
              )}
              <button
                draggable
                type="button"
                onDragStart={(e) => {
                  onDragStart(block.id);
                  e.dataTransfer!.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  onDragOver(index);
                }}
                onDragEnd={onDragEnd}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggingId) {
                    onDrop(draggingId, index);
                  }
                  onDragEnd();
                }}
                onClick={() => onSelect(block.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(block.id);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 8px",
                  margin: "1px 4px",
                  borderRadius: 4,
                  background: isSelected ? "var(--accent-soft)" : "transparent",
                  color: isSelected ? "var(--accent)" : "var(--ink-2)",
                  fontSize: 12,
                  cursor: "grab",
                  opacity: isDragging ? 0.4 : 1,
                  userSelect: "none",
                  border: "none",
                }}
              >
                <div
                  style={{
                    color: "var(--ink-5)",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <GripVertical size={11} />
                </div>
                <span style={{ fontSize: 11, flexShrink: 0 }}>
                  {getBlockIcon(block.kind)}
                </span>
                <span
                  style={{
                    flex: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {getBlockLabel(block)}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 9.5, color: "var(--ink-5)" }}
                >
                  {index + 1}
                </span>
              </button>
            </div>
          );
        })}
        {dropAt === blocks.length && (
          <div
            style={{
              height: 2,
              background: "var(--accent)",
              margin: "0 6px",
              borderRadius: 2,
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid var(--line)",
          padding: "8px 10px",
        }}
      >
        <span
          className="mono"
          style={{ fontSize: 10.5, color: "var(--ink-4)" }}
        >
          {blocks.length} blocks
        </span>
      </div>
    </aside>
  );
}
