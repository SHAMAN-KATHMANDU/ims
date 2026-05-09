"use client";

import { useState } from "react";
import { useEditorStore } from "../store/editor-store";
import { selectBlocks, selectSelectedId } from "../store/selectors";
import { LayerRow } from "./LayerRow";
import { BlocksAddPanel } from "./BlocksAddPanel";

type PanelTab = "layers" | "add";

export function LayersPanel() {
  const [activeTab, setActiveTab] = useState<PanelTab>("layers");
  const blocks = useEditorStore(selectBlocks);
  const selectedId = useEditorStore(selectSelectedId);

  return (
    <aside
      className="w-60 flex flex-col flex-shrink-0 border-r"
      style={{
        backgroundColor: "var(--bg)",
        borderRightColor: "var(--line)",
      }}
    >
      {/* Tab control */}
      <div
        className="h-12 px-3 flex items-center border-b gap-0"
        style={{ borderBottomColor: "var(--line)" }}
      >
        {(["layers", "add"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 h-full flex items-center justify-center text-xs font-mono font-semibold uppercase tracking-wider transition-colors"
            style={{
              color: activeTab === tab ? "var(--accent)" : "var(--ink-4)",
              borderBottom:
                activeTab === tab
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
            }}
          >
            {tab === "layers" ? "Layers" : "Add"}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "layers" ? (
        <div
          className="flex-1 overflow-auto px-1 py-1.5"
          style={{
            backgroundColor: "var(--bg)",
          }}
        >
          {blocks.length === 0 ? (
            <div
              className="p-3 text-xs text-center"
              style={{ color: "var(--ink-4)" }}
            >
              No blocks yet
            </div>
          ) : (
            blocks.map((block, idx) => (
              <LayerRow
                key={block.id}
                block={block}
                index={idx}
                isSelected={selectedId === block.id}
                depth={0}
              />
            ))
          )}
        </div>
      ) : (
        <BlocksAddPanel />
      )}

      {/* Footer */}
      <div
        className="h-9 px-3 border-t flex items-center"
        style={{
          borderTopColor: "var(--line)",
        }}
      >
        <span className="text-xs font-mono" style={{ color: "var(--ink-4)" }}>
          {blocks.length} blocks
        </span>
      </div>
    </aside>
  );
}
