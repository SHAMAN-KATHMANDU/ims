"use client";

/**
 * EditorTopBar — the 48 px sticky header of SiteEditorPage.
 *
 * Subscribes to the editor-store for undo/redo/dirty state.
 * All local UI state (device, zoom) is passed in as props so
 * SiteEditorPage remains the single source of truth for those.
 */

import {
  Undo2,
  Redo2,
  Eye,
  Rocket,
  Keyboard,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ChevronDown,
  Hash,
  Globe,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore, selectDirty } from "./editor-store";
import { DEVICES, ACCENT, type DeviceKey } from "./editor-config";
import type { PanelId } from "./types";

interface EditorTopBarProps {
  siteName: string;
  scopeLabel: string;
  setActivePanel: (p: PanelId) => void;
  /** Whether a save mutation is currently in-flight */
  isPendingSave: boolean;
  savedAgo: string;
  device: DeviceKey;
  setDevice: (d: DeviceKey) => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setQuickAddOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  previewUrl: string | null;
  setPublishOpen: (open: boolean) => void;
}

export function EditorTopBar({
  siteName,
  scopeLabel,
  setActivePanel,
  isPendingSave,
  savedAgo,
  device,
  setDevice,
  zoom,
  setZoom,
  setQuickAddOpen,
  setShortcutsOpen,
  previewUrl,
  setPublishOpen,
}: EditorTopBarProps) {
  const canUndo = useEditorStore((s) => s.canUndo());
  const canRedo = useEditorStore((s) => s.canRedo());
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const dirty = useEditorStore(selectDirty);

  return (
    <div className="h-12 border-b border-border bg-card flex items-center gap-2 px-3 shrink-0 z-20">
      {/* Site breadcrumb */}
      <div className="flex items-center gap-1.5 mr-1 min-w-0">
        <div className="h-7 w-7 rounded-md grid place-items-center bg-muted shrink-0">
          <Globe size={14} className="text-foreground/80" />
        </div>
        <div className="flex items-center gap-1 min-w-0 text-[12.5px]">
          <span className="font-semibold text-foreground truncate max-w-[160px]">
            {siteName}
          </span>
          <ChevronRight
            size={12}
            className="text-muted-foreground/60 shrink-0"
          />
          <button
            onClick={() => setActivePanel("pages")}
            className="flex items-center gap-1 h-7 px-1.5 rounded hover:bg-muted text-foreground/90 font-medium transition-colors truncate"
            title="Switch page"
          >
            <Hash size={11} className="text-muted-foreground/70 shrink-0" />
            <span className="truncate">{scopeLabel}</span>
            <ChevronDown
              size={11}
              className="text-muted-foreground/60 shrink-0"
            />
          </button>
        </div>
      </div>

      <div className="w-px self-stretch bg-border mx-0.5" />

      {/* Undo / redo */}
      <div className="flex items-center gap-0.5">
        <button
          title="Undo (⌘Z)"
          onClick={undo}
          disabled={!canUndo}
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Undo2 size={13} />
        </button>
        <button
          title="Redo (⌘⇧Z)"
          onClick={redo}
          disabled={!canRedo}
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Redo2 size={13} />
        </button>
      </div>

      <div className="w-px self-stretch bg-border mx-0.5" />

      {/* Save-state chip */}
      <div
        className={cn(
          "hidden md:flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors",
          isPendingSave
            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
            : dirty
              ? "bg-muted text-muted-foreground"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            isPendingSave
              ? "bg-amber-500 animate-pulse"
              : dirty
                ? "bg-muted-foreground/60"
                : "bg-emerald-500",
          )}
        />
        {isPendingSave
          ? "Saving…"
          : dirty
            ? "Unsaved changes"
            : savedAgo === "Saved" || savedAgo === "Unsaved"
              ? "All changes saved"
              : `Saved · ${savedAgo}`}
      </div>

      <div className="flex-1" />

      {/* Device switcher */}
      <div className="flex items-center bg-muted rounded-md p-0.5 gap-0.5">
        {(
          Object.entries(DEVICES) as [
            DeviceKey,
            {
              w: number;
              label: string;
              icon: React.ComponentType<{ size?: number }>;
            },
          ][]
        ).map(([k, d]) => {
          const DevIcon = d.icon;
          return (
            <button
              key={k}
              onClick={() => setDevice(k)}
              title={`${d.label} · ${d.w}px`}
              className={cn(
                "h-7 w-9 grid place-items-center rounded transition-colors",
                device === k
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <DevIcon size={13} />
            </button>
          );
        })}
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-0.5">
        <button
          title="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(1)))}
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ZoomOut size={13} />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="h-7 px-2 rounded text-[11px] font-mono text-muted-foreground hover:bg-muted transition-colors"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          title="Zoom in"
          onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(1)))}
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ZoomIn size={13} />
        </button>
      </div>

      <div className="w-px self-stretch bg-border mx-0.5" />

      {/* Quick-add */}
      <button
        onClick={() => setQuickAddOpen(true)}
        className="flex items-center gap-1.5 h-7 px-2.5 rounded bg-muted hover:bg-muted/80 text-[12px] text-muted-foreground transition-colors"
      >
        <Search size={11} />
        <span className="hidden lg:inline">Quick add</span>
        <kbd className="hidden lg:inline text-[10px] px-1 py-0.5 rounded border border-border bg-card text-muted-foreground/60 font-mono">
          ⌘K
        </kbd>
      </button>

      <button
        title="Keyboard shortcuts (?)"
        onClick={() => setShortcutsOpen(true)}
        className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Keyboard size={13} />
      </button>

      {/* Preview + Publish group */}
      <div className="flex items-center gap-1 ml-1">
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-3 rounded-md border border-border text-[12px] font-medium text-foreground/80 hover:bg-muted/50 flex items-center gap-1.5 transition-colors"
          >
            <Eye size={12} />
            Preview
          </a>
        )}
        <button
          onClick={() => setPublishOpen(true)}
          className="h-8 px-3.5 rounded-md text-[12.5px] font-semibold text-white flex items-center gap-1.5 shadow-sm hover:shadow-md hover:brightness-105 transition-all"
          style={{ background: ACCENT }}
        >
          <Rocket size={12} />
          Publish
        </button>
      </div>
    </div>
  );
}
