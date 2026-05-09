/**
 * Site Editor Page — 3-column layout: Layers · Canvas · Inspector
 *
 * Rewrite matching the design at /tmp/shaman_design/js/builder*.jsx
 * - Scrollable canvas in center (flex-1, min-w-0, overflow-auto)
 * - Draggable layers panel on left (240px, fixed width)
 * - Inspector (properties) panel on right (304px, fixed width)
 * - Top bar with controls
 */

"use client";

import React, { useRef, useEffect } from "react";
import type { BlockNode, SiteLayoutScope } from "@repo/shared";
import { useEditorStore } from "./store/editor-store";
import { selectBlocks, selectLoad } from "./store/selectors";
import { useSiteLayoutQuery } from "./hooks/useSiteLayoutQuery";
import { useAutosave } from "./hooks/useAutosave";
import { useDraftRecovery } from "./hooks/useDraftRecovery";
import { useEditorKeyboard } from "./keyboard/useEditorKeyboard";
import { EditorTopBar } from "./EditorTopBar";
import { LayersPanel } from "./layers/LayersPanel";
import { Canvas } from "./canvas/Canvas";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { DraftRecoveryBanner } from "./shell/DraftRecoveryBanner";

interface SiteEditorPageProps {
  workspace: string;
  pageId: string;
  scope: SiteLayoutScope;
}

export function SiteEditorPage({
  workspace,
  pageId,
  scope,
}: SiteEditorPageProps) {
  const { data: layout, isLoading } = useSiteLayoutQuery(scope);
  const _blocks = useEditorStore(selectBlocks);
  const load = useEditorStore(selectLoad);
  const loadedRef = useRef(false);

  // Load the layout into store ONCE, guarding against repeated refetches
  useEffect(() => {
    if (loadedRef.current || !layout) return;
    if (layout.draftBlocks) {
      load(layout.draftBlocks as BlockNode[]);
      loadedRef.current = true;
    } else if (layout.blocks) {
      load(layout.blocks as BlockNode[]);
      loadedRef.current = true;
    }
  }, [layout, load]);

  // Draft recovery banner
  const draftRecovery = useDraftRecovery(workspace, scope);

  // Autosave
  useAutosave(scope);

  // Keyboard shortcuts
  useEditorKeyboard({ enabled: true });

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-sunken)]">
        <div className="text-[var(--ink-4)]">Loading page editor...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-sunken)]">
      {/* Top bar: 48px */}
      <EditorTopBar workspace={workspace} pageId={pageId} scope={scope} />

      <DraftRecoveryBanner recovery={draftRecovery} />

      {/* Body: layers (240px) · canvas (flex-1) · inspector (304px) */}
      <div className="flex-1 flex min-h-0">
        <LayersPanel />
        <main className="flex-1 min-w-0 overflow-auto">
          <Canvas scope={scope} />
        </main>
        <InspectorPanel workspace={workspace} pageId={pageId} scope={scope} />
      </div>
    </div>
  );
}
