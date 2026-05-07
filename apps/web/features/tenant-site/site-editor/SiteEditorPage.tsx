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

  // Keyboard shortcuts
  useEditorKeyboard({
    enabled: true,
    onSlashMenu: () => {
      // Phase 2 slash menu will open
    },
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
        onPublishClick={() => setShowPublishModal(true)}
      />

      <DraftRecoveryBanner recovery={draftRecovery} />

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left dock */}
        <LeftDock scope={scope} onScopeChange={setScope} />

        {/* Canvas area */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div ref={canvasRef} className="flex-1 relative">
            <CanvasFrame
              scope={scope}
              device={device}
              zoom={1}
              onRefresh={() => {}}
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
        scope={scope}
        draftBlocks={draftBlocks}
        publishedBlocks={(layout?.blocks as BlockNode[] | undefined) ?? null}
      />
    </div>
  );
}
