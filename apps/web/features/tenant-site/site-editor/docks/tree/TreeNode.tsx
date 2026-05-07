"use client";

import React, { useState } from "react";
import { ChevronDown, Eye, EyeOff, Trash2, Copy } from "lucide-react";
import { useEditorStore } from "../../store/editor-store";
import {
  selectSetSelected,
  selectRemoveBlock,
  selectDuplicateBlock,
  selectSelectedId,
} from "../../store/selectors";
import { getBlockIcon } from "../../catalog/block-icons";
import type { BlockNode } from "@repo/shared";

interface TreeNodeProps {
  block: BlockNode;
  isSelected: boolean;
  depth: number;
}

export function TreeNode({ block, isSelected, depth }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const setSelected = useEditorStore(selectSetSelected);
  const removeBlock = useEditorStore(selectRemoveBlock);
  const duplicateBlock = useEditorStore(selectDuplicateBlock);
  const selectedId = useEditorStore(selectSelectedId);

  const Icon = getBlockIcon(block.kind);
  const hasChildren = block.children && block.children.length > 0;
  // BlockVisibility doesn't have a 'hidden' property; that's typically handled via visibility.device
  const isHidden = false;

  const handleSelect = () => {
    setSelected(block.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeBlock(block.id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateBlock(block.id);
  };

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Toggle visibility via updateBlockVisibility
  };

  return (
    <div>
      <button
        type="button"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleSelect}
        className={`flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer transition-colors w-full text-left border-0 bg-transparent ${
          isSelected
            ? "bg-blue-100 text-blue-700"
            : "hover:bg-gray-100 text-gray-700"
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {/* Expand/collapse chevron */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-gray-200 rounded transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                isExpanded ? "" : "-rotate-90"
              }`}
            />
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Block icon and label */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {React.isValidElement(Icon) ? (
            Icon
          ) : (
            <span className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="text-sm font-medium truncate">{block.kind}</span>
          {isHidden && (
            <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded flex-shrink-0">
              Hidden
            </span>
          )}
        </div>

        {/* Action buttons (visible on hover) */}
        {isHovered && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={handleToggleVisibility}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title={isHidden ? "Show" : "Hide"}
            >
              {isHidden ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={handleDuplicate}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-red-100 hover:text-red-600 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </button>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {block.children!.map((child) => (
            <TreeNode
              key={child.id}
              block={child}
              isSelected={child.id === selectedId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
