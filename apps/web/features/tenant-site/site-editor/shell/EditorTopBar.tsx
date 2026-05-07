/**
 * Editor top bar: site/scope selector, undo/redo, device toggle, publish menu.
 */

import React from "react";
import { ChevronDown, Undo2, Redo2 } from "lucide-react";
import type { SiteLayoutScope } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import {
  selectCanUndo,
  selectCanRedo,
  selectUndo,
  selectRedo,
} from "../store/selectors";

interface EditorTopBarProps {
  scope: SiteLayoutScope;
  onScopeChange: (scope: SiteLayoutScope) => void;
  device: "desktop" | "tablet" | "mobile";
  onDeviceChange: (device: "desktop" | "tablet" | "mobile") => void;
  onPublishClick?: () => void;
}

export const EditorTopBar = React.forwardRef<HTMLDivElement, EditorTopBarProps>(
  (
    {
      scope,
      onScopeChange: _onScopeChange,
      device,
      onDeviceChange,
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
        {/* Left: Scope selector */}
        <div className="flex items-center gap-4">
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
