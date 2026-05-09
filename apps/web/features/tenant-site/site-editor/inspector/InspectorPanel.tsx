"use client";

import { useState } from "react";
import { useEditorStore } from "../store/editor-store";
import { selectBlocks, selectSelectedId } from "../store/selectors";
import { PageTab } from "./PageTab";
import { BlockTab } from "./BlockTab";
import { SeoTab } from "./SeoTab";
import { HistoryTab } from "./HistoryTab";

type TabId = "page" | "block" | "seo" | "history";

interface InspectorPanelProps {
  workspace: string;
  pageId: string;
  scope: string;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "page", label: "Page" },
  { id: "block", label: "Block" },
  { id: "seo", label: "SEO" },
  { id: "history", label: "History" },
];

export function InspectorPanel({
  workspace,
  pageId,
  scope,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("page");
  const blocks = useEditorStore(selectBlocks);
  const selectedId = useEditorStore(selectSelectedId);
  const selectedBlock = blocks.find((b) => b.id === selectedId);

  return (
    <aside
      className="w-76 flex flex-col flex-shrink-0 border-l"
      style={{
        backgroundColor: "var(--bg)",
        borderLeftColor: "var(--line)",
      }}
    >
      {/* Tab bar */}
      <div
        className="flex border-b"
        style={{
          borderBottomColor: "var(--line)",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-2 text-xs font-medium transition-colors border-b-2`}
            style={{
              borderBottomColor:
                activeTab === tab.id ? "var(--ink)" : "transparent",
              color: activeTab === tab.id ? "var(--ink)" : "var(--ink-3)",
              fontWeight: activeTab === tab.id ? 600 : 450,
              marginBottom: "-1px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div
        className="flex-1 overflow-auto"
        style={{
          backgroundColor: "var(--bg)",
        }}
      >
        {activeTab === "page" && (
          <PageTab _workspace={workspace} pageId={pageId} _scope={scope} />
        )}
        {activeTab === "block" && <BlockTab block={selectedBlock} />}
        {activeTab === "seo" && (
          <SeoTab _workspace={workspace} pageId={pageId} scope={scope} />
        )}
        {activeTab === "history" && (
          <HistoryTab _workspace={workspace} pageId={pageId} _scope={scope} />
        )}
      </div>
    </aside>
  );
}
