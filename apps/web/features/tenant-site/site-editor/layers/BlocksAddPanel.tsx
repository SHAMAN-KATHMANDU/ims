"use client";

import { GROUPED_CATALOG } from "../catalog/grouped-catalog";
import { useEditorStore } from "../store/editor-store";
import { selectBlocks } from "../store/selectors";
import type { BlockNode, BlockKind } from "@repo/shared";
import { BLOCK_CATALOG_ENTRIES } from "@repo/shared";

export function BlocksAddPanel() {
  const blocks = useEditorStore(selectBlocks);
  const addBlock = useEditorStore((s) => s.addBlock);

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    kind: BlockKind,
  ) => {
    e.dataTransfer.setData("application/x-block-kind", kind);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleClick = (kind: BlockKind) => {
    const entry = BLOCK_CATALOG_ENTRIES.find((e) => e.kind === kind);
    if (!entry) return;
    const newBlock: BlockNode = {
      id: `block-${crypto.randomUUID().slice(0, 8)}`,
      kind,
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
                key={entry.kind}
                draggable
                onDragStart={(e) => handleDragStart(e, entry.kind)}
                onClick={() => handleClick(entry.kind)}
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
