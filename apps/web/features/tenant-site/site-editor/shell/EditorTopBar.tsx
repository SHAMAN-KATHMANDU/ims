/**
 * Editor top bar: Content/Design toggle, scope selector, undo/redo,
 * device toggle, publish menu.
 *
 * The Content/Design toggle is an INTERNAL mode switch — it doesn't
 * navigate; it just flips the editor between Design (canvas + inspector)
 * and Content (full-screen Pages/Blog management). Design-only controls
 * (scope, undo/redo, device, publish) hide when mode === "content".
 */

import React, { useState, useRef, useEffect } from "react";
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

export type EditorMode = "design" | "content";

interface EditorTopBarProps {
  scope: SiteLayoutScope;
  onScopeChange: (scope: SiteLayoutScope) => void;
  device: "desktop" | "tablet" | "mobile";
  onDeviceChange: (device: "desktop" | "tablet" | "mobile") => void;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onPublishClick?: () => void;
}

const SCOPE_OPTIONS: readonly SiteLayoutScope[] = [
  "home",
  "products-index",
  "product-detail",
  "offers",
  "header",
  "page",
  "footer",
];

export const EditorTopBar = React.forwardRef<HTMLDivElement, EditorTopBarProps>(
  (
    {
      scope,
      onScopeChange,
      device,
      onDeviceChange,
      mode,
      onModeChange,
      onPublishClick,
    },
    ref,
  ) => {
    const [showScopeMenu, setShowScopeMenu] = useState(false);
    const scopeMenuRef = useRef<HTMLDivElement>(null);
    const canUndo = useEditorStore(selectCanUndo);
    const canRedo = useEditorStore(selectCanRedo);
    const undo = useEditorStore(selectUndo);
    const redo = useEditorStore(selectRedo);

    const isDesign = mode === "design";

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          scopeMenuRef.current &&
          !scopeMenuRef.current.contains(e.target as Node)
        ) {
          setShowScopeMenu(false);
        }
      };

      if (showScopeMenu) {
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
          document.removeEventListener("mousedown", handleClickOutside);
      }
    }, [showScopeMenu]);

    return (
      <div
        ref={ref}
        className="flex items-center justify-between h-12 px-4 bg-white border-b border-gray-200"
      >
        {/* Left: Content/Design toggle + (design-only) scope selector */}
        <div className="flex items-center gap-4">
          <ModeSwitcher mode={mode} onModeChange={onModeChange} />
          {isDesign && (
            <div ref={scopeMenuRef} className="relative">
              <button
                onClick={() => setShowScopeMenu(!showScopeMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium capitalize">{scope}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showScopeMenu && (
                <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px] z-50">
                  {SCOPE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        onScopeChange(option);
                        setShowScopeMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm capitalize hover:bg-gray-50 transition-colors ${
                        option === scope
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : ""
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center: Undo/Redo (design only) */}
        {isDesign && (
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
        )}

        {/* Right: Device selector + Publish (design only) */}
        {isDesign && (
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
        )}
      </div>
    );
  },
);

EditorTopBar.displayName = "EditorTopBar";

/**
 * Segmented Content / Design pill — flips the editor's internal mode so
 * the canvas/inspector hide and the Pages+Blog management view takes the
 * main area. Both modes live inside the same editor route; no navigation.
 */
function ModeSwitcher({
  mode,
  onModeChange,
}: {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}) {
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
      <button
        type="button"
        role="tab"
        aria-selected={mode === "content"}
        onClick={() => onModeChange("content")}
        className={`${baseClass} ${mode === "content" ? activeClass : inactiveClass}`}
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
        Content
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "design"}
        onClick={() => onModeChange("design")}
        className={`${baseClass} ${mode === "design" ? activeClass : inactiveClass}`}
      >
        <Paintbrush className="h-3.5 w-3.5" aria-hidden="true" />
        Design
      </button>
    </div>
  );
}
