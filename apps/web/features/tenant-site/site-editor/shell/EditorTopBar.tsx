/**
 * Editor top bar: Content/Design toggle, scope selector, undo/redo,
 * device toggle, publish menu.
 *
 * The Content/Design toggle was previously rendered inside the admin
 * top-bar (apps/web/components/layout/top-bar.tsx) — relocated here so
 * the admin chrome stays focused on content workflows and the toggle
 * lives next to the design surface it activates.
 */

import React from "react";
import Link from "next/link";
import {
  ChevronDown,
  Undo2,
  Redo2,
  LayoutGrid,
  Paintbrush,
} from "lucide-react";
import type { SiteLayoutScope } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import {
  selectCanUndo,
  selectCanRedo,
  selectUndo,
  selectRedo,
} from "../store/selectors";
import { contentEntryPath } from "@/lib/editor-mode";

interface EditorTopBarProps {
  scope: SiteLayoutScope;
  onScopeChange: (scope: SiteLayoutScope) => void;
  device: "desktop" | "tablet" | "mobile";
  onDeviceChange: (device: "desktop" | "tablet" | "mobile") => void;
  workspace: string;
  onPublishClick?: () => void;
}

export const EditorTopBar = React.forwardRef<HTMLDivElement, EditorTopBarProps>(
  (
    {
      scope,
      onScopeChange: _onScopeChange,
      device,
      onDeviceChange,
      workspace,
      onPublishClick,
    },
    ref,
  ) => {
    const canUndo = useEditorStore(selectCanUndo);
    const canRedo = useEditorStore(selectCanRedo);
    const undo = useEditorStore(selectUndo);
    const redo = useEditorStore(selectRedo);

    return (
      <div
        ref={ref}
        className="flex items-center justify-between h-12 px-4 bg-white border-b border-gray-200"
      >
        {/* Left: Content/Design toggle + scope selector */}
        <div className="flex items-center gap-4">
          <ModeSwitcher workspace={workspace} />
          <button className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 transition-colors">
            <span className="text-sm font-medium capitalize">{scope}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Undo/Redo */}
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            title="Undo (⌘Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            title="Redo (⌘⇧Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Device selector & Publish */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-gray-100 rounded p-1">
            {["desktop", "tablet", "mobile"].map((d) => (
              <button
                key={d}
                onClick={() =>
                  onDeviceChange(d as "desktop" | "tablet" | "mobile")
                }
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  device === d ? "bg-white shadow-sm" : "hover:bg-gray-200"
                }`}
              >
                {d === "desktop" ? "🖥" : d === "tablet" ? "📱" : "📱"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onPublishClick}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            Publish
          </button>
        </div>
      </div>
    );
  },
);

EditorTopBar.displayName = "EditorTopBar";

/**
 * Segmented Content / Design pill — same UX as the previous admin top-bar
 * version, just relocated. Design pill is always active in the editor;
 * Content pill links back to the workspace's content hub.
 */
function ModeSwitcher({ workspace }: { workspace: string }) {
  const baseClass =
    "inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const activeClass = "bg-blue-600 text-white";
  const inactiveClass = "text-gray-600 hover:text-gray-900 hover:bg-gray-100";
  return (
    <div
      role="tablist"
      aria-label="Workspace mode"
      className="inline-flex items-center rounded-md border border-gray-200 bg-white overflow-hidden"
    >
      <Link
        href={contentEntryPath(workspace)}
        role="tab"
        aria-selected={false}
        className={`${baseClass} ${inactiveClass}`}
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
        Content
      </Link>
      <span
        role="tab"
        aria-selected={true}
        className={`${baseClass} ${activeClass} cursor-default`}
      >
        <Paintbrush className="h-3.5 w-3.5" aria-hidden="true" />
        Design
      </span>
    </div>
  );
}
