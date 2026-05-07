/**
 * Phase 2 Site Editor Page: shell + canvas integration.
 * Orchestrates top bar, docks, canvas, and keyboard handling.
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
import type { BlockNode, SiteLayoutScope } from "@repo/shared";
import { useEditorStore } from "./store/editor-store";
import { selectBlocks, selectLoad, selectSelectedId } from "./store/selectors";
import { useSiteLayoutQuery } from "./hooks/useSiteLayoutQuery";
import { useAutosave } from "./hooks/useAutosave";
import { useDraftRecovery } from "./hooks/useDraftRecovery";
import { useEditorKeyboard } from "./keyboard/useEditorKeyboard";
import { EditorTopBar } from "./shell/EditorTopBar";
import { LeftDock } from "./shell/LeftDock";
import { RightDock } from "./shell/RightDock";
import { KeyboardShortcutsModal } from "./shell/KeyboardShortcutsModal";
import { DraftRecoveryBanner } from "./shell/DraftRecoveryBanner";
import { PublishModal } from "./shell/PublishModal";
import { CanvasFrame } from "./canvas/CanvasFrame";
import { CanvasOverlay } from "./canvas/CanvasOverlay";
import { SlashMenu } from "./canvas/SlashMenu";
import {
  BlockContextMenu,
  type BlockMenuState,
} from "./canvas/BlockContextMenu";
import { PdpProductPicker } from "./canvas/PdpProductPicker";

interface SiteEditorPageProps {
  tenantId: string;
  initialScope?: SiteLayoutScope;
}

export function SiteEditorPage({
  tenantId,
  initialScope = "home",
}: SiteEditorPageProps) {
  const [scope, setScope] = useState<SiteLayoutScope>(initialScope);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<BlockMenuState>(null);
  // Bumped whenever something the iframe should hard-reload around happens
  // (publish succeeded, scope changed, etc.). CanvasFrame keys its iframe
  // on this so the published version reloads cleanly.
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  // Active product id used when scope === "product-detail" — passed as
  // pageId to usePreviewUrl so the iframe hydrates the right SKU.
  const [pdpProductId, setPdpProductId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const { data: layout, isLoading } = useSiteLayoutQuery(scope);
  const load = useEditorStore(selectLoad);
  const selectedId = useEditorStore(selectSelectedId);
  const draftBlocks = useEditorStore(selectBlocks);

  // Load the layout into the store ONCE per scope. Without the ref guard, any
  // TanStack refetch (window-focus, autosave round-trip invalidation, network
  // reconnect) returns a new `layout` reference and re-fires `load()`, wiping
  // the user's in-memory undo history and selection mid-session.
  const loadedScopeRef = useRef<SiteLayoutScope | null>(null);
  useEffect(() => {
    if (loadedScopeRef.current === scope) return;
    if (layout?.draftBlocks) {
      load(layout.draftBlocks as BlockNode[]);
      loadedScopeRef.current = scope;
    } else if (layout?.blocks) {
      load(layout.blocks as BlockNode[]);
      loadedScopeRef.current = scope;
    }
  }, [layout, load, scope]);

  // Draft recovery (banner is rendered below)
  const draftRecovery = useDraftRecovery(tenantId, scope);

  // Autosave
  useAutosave(scope);

  // Keyboard shortcuts — `/` (or ⌘K) opens the inline slash menu anchored
  // to the currently selected block; if nothing's selected the menu inserts
  // at the root.
  useEditorKeyboard({
    enabled: true,
    onSlashMenu: () => setSlashMenuOpen(true),
  });

  // Keyboard shortcut for Help (?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "?") {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top bar */}
      <EditorTopBar
        scope={scope}
        onScopeChange={setScope}
        device={device}
        onDeviceChange={setDevice}
        workspace={tenantId}
        onPublishClick={() => setShowPublishModal(true)}
      />

      <DraftRecoveryBanner recovery={draftRecovery} />

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left dock */}
        <LeftDock scope={scope} onScopeChange={setScope} workspace={tenantId} />

        {/* Canvas area. The wrapper's onContextMenu picks up right-clicks
            that land on the editor chrome around the iframe (the iframe
            itself stays cross-origin and routes context menus via the
            preview message bus — wired separately in Fix 8.4). */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- canvas wrapper handles right-click for the BlockContextMenu; iframe-side support is wired separately via the preview message bus */}
        <div
          className="flex-1 flex flex-col relative overflow-hidden"
          onContextMenu={(e) => {
            if (!selectedId) return;
            e.preventDefault();
            setContextMenu({
              blockId: selectedId,
              x: e.clientX,
              y: e.clientY,
            });
          }}
        >
          {scope === "product-detail" && (
            <PdpProductPicker
              productId={pdpProductId}
              onProductIdChange={setPdpProductId}
            />
          )}
          <div ref={canvasRef} className="flex-1 relative">
            <CanvasFrame
              scope={scope}
              device={device}
              zoom={1}
              pageId={
                scope === "product-detail"
                  ? (pdpProductId ?? undefined)
                  : undefined
              }
              refreshKey={previewRefreshKey}
              onRefresh={() => setPreviewRefreshKey((k) => k + 1)}
            />
            <div ref={overlayRef} className="absolute inset-0">
              <CanvasOverlay />
            </div>
          </div>
        </div>

        {/* Right dock (inspector) */}
        <RightDock selectedBlockId={selectedId} onClose={() => {}} />
      </div>

      {/* Modals */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
      <PublishModal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onPublished={() => setPreviewRefreshKey((k) => k + 1)}
        scope={scope}
        draftBlocks={draftBlocks}
        publishedBlocks={(layout?.blocks as BlockNode[] | undefined) ?? null}
      />
      <SlashMenu
        isOpen={slashMenuOpen}
        onClose={() => setSlashMenuOpen(false)}
        anchorId={selectedId ?? undefined}
      />
      <BlockContextMenu
        state={contextMenu}
        blocks={draftBlocks}
        onClose={() => setContextMenu(null)}
      />
    </div>
  );
}
