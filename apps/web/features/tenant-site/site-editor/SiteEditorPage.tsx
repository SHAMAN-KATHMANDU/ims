/**
 * Site Editor Page — wraps BlockTreeEditor for a single page's layout.
 *
 * Loads the SiteLayout and wires autosave + draft recovery.
 */

"use client";

import React, { useRef, useEffect, useMemo } from "react";
import type { BlockNode, SiteLayoutScope } from "@repo/shared";
import { MOCK_DATA_CONTEXT } from "@repo/blocks";
import { useEditorStore } from "./store/editor-store";
import { selectLoad } from "./store/selectors";
import { useSiteLayoutQuery } from "./hooks/useSiteLayoutQuery";
import { useAutosave } from "./hooks/useAutosave";
import { useDraftRecovery } from "./hooks/useDraftRecovery";
import { EditorTopBar } from "./EditorTopBar";
import { BlockTreeEditor } from "./BlockTreeEditor";
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
  // Custom pages (kind="page") store their blocks in
  // SiteLayout(scope="page", pageId=<pageId>). Chrome scopes (header,
  // footer, etc.) store theirs in SiteLayout(scope=<chrome>, pageId=null).
  // The layoutPageId we send to the API must match the row's keying.
  const layoutPageId = scope === "page" ? pageId : null;
  const { data: layout, isLoading } = useSiteLayoutQuery(scope, layoutPageId);
  const load = useEditorStore(selectLoad);
  const loadedRef = useRef(false);

  // Load the layout into store ONCE
  useEffect(() => {
    if (loadedRef.current || !layout) return;
    const blocksToLoad = (layout.draftBlocks ?? layout.blocks) as BlockNode[];
    load(blocksToLoad);
    loadedRef.current = true;
  }, [layout, load]);

  // Autosave
  useAutosave(scope, layoutPageId);

  // Draft recovery banner
  const draftRecovery = useDraftRecovery(workspace, scope);

  // Data context
  const dataContext = useMemo(() => {
    const context = { ...MOCK_DATA_CONTEXT };
    // TODO: enhance with tenant-specific data (products, categories, etc.)
    return context;
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-sunken)]">
        <div className="text-[var(--ink-4)]">Loading page editor...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-sunken)]">
      <EditorTopBar workspace={workspace} pageId={pageId} scope={scope} />
      <DraftRecoveryBanner recovery={draftRecovery} />
      <BlockTreeEditor
        blocks={(layout?.draftBlocks ?? layout?.blocks ?? []) as BlockNode[]}
        onChange={() => {}}
        dataContext={dataContext}
        workspace={workspace}
        pageId={pageId}
        scope={scope}
      />
    </div>
  );
}
