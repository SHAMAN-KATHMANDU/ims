"use client";

import { GROUPED_CATALOG } from "../catalog/grouped-catalog";
import { useEditorStore } from "../store/editor-store";
import { selectBlocks, selectAddBlock } from "../store/selectors";
import type { BlockNode, CatalogEntry } from "@repo/shared";

export function BlocksAddPanel() {
  const blocks = useEditorStore(selectBlocks);
  const addBlock = useEditorStore(selectAddBlock);

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    entry: CatalogEntry,
  ) => {
    e.dataTransfer.setData("application/x-block-kind", entry.kind);
    // Preset variants (e.g. "New Arrivals" vs base "Product grid") share a
    // kind but differ in default props — carry the catalog id so the drop
    // handler can resolve the exact entry the user dragged.
    e.dataTransfer.setData(
      "application/x-block-catalog-id",
      entry.id ?? entry.kind,
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  // Use the clicked entry directly — looking it up again by kind would
  // always resolve preset variants to the FIRST entry of that kind, so
  // "Hot Deals" / "New Arrivals" tiles inserted the base grid instead.
  const handleClick = (entry: CatalogEntry) => {
    const newBlock: BlockNode = {
      id: `block-${crypto.randomUUID().slice(0, 8)}`,
      kind: entry.kind,
      props: entry.createDefaultProps(),
    };
    addBlock(newBlock, blocks.length);
  };

  return (
    <div className="flex-1 overflow-auto px-1 py-3 space-y-4">
      {GROUPED_CATALOG.map((group) => (
        <div key={group.group}>
          <h3
            className="px-2 mb-2 text-xs font-mono font-semibold uppercase tracking-wider"
            style={{ color: "var(--ink-4)" }}
          >
            {group.group}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {group.entries.map((entry) => (
              <div
                key={entry.id ?? entry.kind}
                draggable
                onDragStart={(e) => handleDragStart(e, entry)}
                onClick={() => handleClick(entry)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleClick(entry);
                  }
                }}
                role="button"
                tabIndex={0}
                className="p-2 rounded cursor-pointer text-xs transition-colors"
                style={{
                  backgroundColor: "var(--bg-sunken)",
                  color: "var(--ink-3)",
                  border: "1px solid var(--line)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--bg-elev)";
                  e.currentTarget.style.borderColor = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--bg-sunken)";
                  e.currentTarget.style.borderColor = "var(--line)";
                }}
                title={entry.description}
              >
                <div className="font-medium">{entry.label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
