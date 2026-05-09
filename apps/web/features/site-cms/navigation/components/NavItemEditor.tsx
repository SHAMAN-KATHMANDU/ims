"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LinkPicker } from "@/features/tenant-site/site-editor/inspector/LinkPicker";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type { NavItem } from "../types";

interface NavItemEditorProps {
  item: NavItem;
  onUpdate: (item: NavItem) => void;
  onDelete: () => void;
  onAddChild?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  canAddChild?: boolean;
  level?: number;
}

export function NavItemEditor({
  item,
  onUpdate,
  onDelete,
  onAddChild,
  isExpanded = false,
  onToggleExpand,
  canAddChild = true,
  level = 0,
}: NavItemEditorProps) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);

  const hasChildren = item.children && item.children.length > 0;

  return (
    <div
      className="space-y-2"
      style={{
        paddingLeft: level > 0 ? `${level * 16}px` : undefined,
      }}
    >
      <div className="flex items-center gap-2 p-2 bg-bg-sunken rounded border border-line">
        {hasChildren && (
          <button
            onClick={onToggleExpand}
            className="p-1 hover:bg-bg-active rounded transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-6" />}

        <div className="flex-1 min-w-0">
          {editingLabel ? (
            <Input
              autoFocus
              value={item.label}
              onChange={(e) => onUpdate({ ...item, label: e.target.value })}
              onBlur={() => setEditingLabel(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditingLabel(false);
              }}
              placeholder="Item label"
              className="h-7 text-sm"
            />
          ) : (
            <button
              onClick={() => setEditingLabel(true)}
              className="text-sm font-medium text-ink hover:text-ink-2 text-left w-full truncate"
            >
              {item.label || "(Untitled)"}
            </button>
          )}
        </div>

        <button
          onClick={onDelete}
          className="p-1 text-ink-4 hover:text-danger hover:bg-bg-active rounded transition-colors"
          aria-label="Delete item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="pl-2 space-y-2 border-l border-line-2">
        <div className="text-xs font-medium text-ink-3">Link</div>
        {editingUrl ? (
          <LinkPicker
            value={item.href}
            onChange={(href) => {
              onUpdate({ ...item, href });
              setEditingUrl(false);
            }}
          />
        ) : (
          <button
            onClick={() => setEditingUrl(true)}
            className="text-xs text-accent hover:underline text-left"
          >
            {item.href ? (
              <>
                Current:{" "}
                <code className="text-ink-2 font-mono">{item.href}</code>
              </>
            ) : (
              "Click to set URL"
            )}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 pl-2">
        <input
          type="checkbox"
          id={`target-${item.id}`}
          checked={item.target === "_blank"}
          onChange={(e) => {
            onUpdate({
              ...item,
              target: e.target.checked ? "_blank" : undefined,
            });
          }}
          className="h-4 w-4 rounded border-line"
        />
        <label
          htmlFor={`target-${item.id}`}
          className="text-xs text-ink-3 cursor-pointer"
        >
          Open in new tab
        </label>
      </div>

      {canAddChild && (
        <div className="pl-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onAddChild}
            className="h-6 text-xs"
          >
            + Add child item
          </Button>
        </div>
      )}

      {isExpanded && hasChildren && (
        <div className="space-y-2 mt-2">
          {item.children?.map((child) => (
            <NavItemEditor
              key={child.id}
              item={child}
              level={level + 1}
              onUpdate={(updated) => {
                onUpdate({
                  ...item,
                  children: item.children?.map((c) =>
                    c.id === updated.id ? updated : c,
                  ),
                });
              }}
              onDelete={() => {
                onUpdate({
                  ...item,
                  children: item.children?.filter((c) => c.id !== child.id),
                });
              }}
              canAddChild={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
