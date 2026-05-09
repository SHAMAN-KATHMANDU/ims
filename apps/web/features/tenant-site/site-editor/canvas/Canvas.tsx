"use client";

import { Plus } from "lucide-react";
import { type BlockDataContext } from "@repo/blocks";
import { useEditorStore } from "../store/editor-store";
import {
  selectBlocks,
  selectSelectedId,
  selectDevice,
} from "../store/selectors";
import { useDomains } from "../../hooks/use-domains";
import { BlockWrap } from "./BlockWrap";
import type { BlockNode, BlockKind } from "@repo/shared";
import { BLOCK_CATALOG_ENTRIES } from "@repo/shared";

interface CanvasProps {
  scope: string;
  dataContext: BlockDataContext;
}

export function Canvas({ scope: _unused_scope, dataContext }: CanvasProps) {
  const blocks = useEditorStore(selectBlocks);
  const selectedId = useEditorStore(selectSelectedId);
  const device = useEditorStore(selectDevice);
  const { addBlock } = useEditorStore();
  const { data: domains } = useDomains();

  const handleAddBlock = () => {
    const entry = BLOCK_CATALOG_ENTRIES.find((e) => e.kind === "rich-text");
    const props = entry?.createDefaultProps() ?? { source: "" };
    const newBlock: BlockNode = {
      id: `block-${crypto.randomUUID().slice(0, 8)}`,
      kind: "rich-text" as BlockKind,
      props,
    };
    addBlock(newBlock, blocks.length);
  };

  const deviceWidth = {
    desktop: 1240,
    tablet: 820,
    mobile: 414,
  }[device];

  const domain = domains?.[0]?.hostname || `{tenant}.example.com`;

  return (
    <div
      className="flex justify-center py-8 px-6 min-h-full overflow-auto"
      style={{ backgroundColor: "var(--bg-sunken)" }}
    >
      <div
        className="rounded-lg border p-8 flex-shrink-0"
        style={{
          width: deviceWidth,
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--line)",
          boxShadow: "var(--shadow-md)",
          minHeight: "600px",
        }}
      >
        {/* Canvas chrome: address bar */}
        <div
          className="h-8 rounded-t flex items-center gap-2 px-3 mb-6 border-b flex-shrink-0"
          style={{
            backgroundColor: "var(--bg-sunken)",
            borderBottomColor: "var(--line)",
          }}
        >
          <div className="flex gap-1">
            {["#FF5F57", "#FEBC2E", "#28C840"].map((color) => (
              <div
                key={color}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color, opacity: 0.6 }}
              />
            ))}
          </div>
          <div
            className="flex-1 h-5 rounded px-2 flex items-center text-xs font-mono"
            style={{
              backgroundColor: "var(--bg)",
              border: "1px solid var(--line)",
              color: "var(--ink-4)",
            }}
          >
            🔒 {domain}/
          </div>
          <span
            className="text-xs font-mono uppercase"
            style={{ color: "var(--ink-4)" }}
          >
            {deviceWidth}w
          </span>
        </div>

        {/* Block canvas */}
        <div className="space-y-1">
          {blocks.length === 0 ? (
            <div
              className="py-12 text-center"
              style={{ color: "var(--ink-4)" }}
            >
              <p className="text-sm mb-3">No blocks yet</p>
              <button
                onClick={handleAddBlock}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs"
                style={{
                  backgroundColor: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  color: "var(--ink-3)",
                }}
              >
                <Plus size={12} />
                Add block
              </button>
            </div>
          ) : (
            blocks.map((block, idx) => (
              <BlockWrap
                key={block.id}
                block={block}
                index={idx}
                isSelected={selectedId === block.id}
                dataContext={dataContext}
              />
            ))
          )}
        </div>

        {/* Add block button at end */}
        <button
          onClick={handleAddBlock}
          className="mt-3 flex items-center gap-2 px-3 py-2 rounded text-xs"
          style={{
            color: "var(--ink-4)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "var(--bg-sunken)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "transparent";
          }}
        >
          <Plus size={14} />
          Add block · or type{" "}
          <span
            className="font-mono text-xs ml-1 px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: "var(--bg-sunken)",
              color: "var(--ink-4)",
            }}
          >
            /
          </span>
        </button>
      </div>
    </div>
  );
}
