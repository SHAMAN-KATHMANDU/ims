/**
 * BlockTreeEditor — reusable multi-panel editor component.
 *
 * Thin wrapper around Canvas + LayersPanel + InspectorPanel. Handles loading
 * blocks into store and synchronizing changes back to parent via onChange.
 *
 * The store is currently global; for multi-page scenarios, the parent must
 * save/restore blocks when switching pages.
 */

"use client";

import React, { useEffect, useRef } from "react";
import type { BlockNode } from "@repo/shared";
import type { BlockDataContext } from "@repo/blocks";
import { MOCK_DATA_CONTEXT } from "@repo/blocks";
import { useEditorStore } from "./store/editor-store";
import { selectBlocks } from "./store/selectors";
import { useEditorKeyboard } from "./keyboard/useEditorKeyboard";
import { LayersPanel } from "./layers/LayersPanel";
import { Canvas } from "./canvas/Canvas";
import { InspectorPanel } from "./inspector/InspectorPanel";

interface BlockTreeEditorProps {
  blocks: BlockNode[];
  onChange: (blocks: BlockNode[]) => void;
  dataContext?: BlockDataContext;
  workspace?: string;
  pageId?: string;
  scope?: string;
}

export function BlockTreeEditor({
  blocks,
  onChange,
  dataContext = MOCK_DATA_CONTEXT,
  workspace = "default",
  pageId = "page",
  scope = "home",
}: BlockTreeEditorProps) {
  const storeBlocks = useEditorStore(selectBlocks);
  const load = useEditorStore((s) => s.load);
  const loadedRef = useRef(false);

  // Load blocks into store once at mount
  useEffect(() => {
    if (!loadedRef.current) {
      load(blocks);
      loadedRef.current = true;
    }
  }, [blocks, load]);

  // Forward store changes to parent
  useEffect(() => {
    onChange(storeBlocks);
  }, [storeBlocks, onChange]);

  // Keyboard shortcuts
  useEditorKeyboard({ enabled: true });

  return (
    <div className="flex-1 flex min-h-0">
      <LayersPanel />
      <main className="flex-1 min-w-0 overflow-auto">
        <Canvas scope={scope} dataContext={dataContext} />
      </main>
      <InspectorPanel workspace={workspace} pageId={pageId} scope={scope} />
    </div>
  );
}
