"use client";

import React from "react";
import { useEditorStore } from "../../store/editor-store";
import { selectAddBlock } from "../../store/selectors";
import type { CatalogEntry } from "../../catalog/block-catalog";
import { getBlockIcon } from "../../catalog/block-icons";

interface BlockTileProps {
  catalog: CatalogEntry;
}

export function BlockTile({ catalog }: BlockTileProps) {
  const addBlock = useEditorStore(selectAddBlock);

  const Icon = getBlockIcon(catalog.kind);

  const handleClick = () => {
    const block = {
      id: `block-${Date.now()}`,
      kind: catalog.kind,
      props: catalog.createDefaultProps(),
    };
    addBlock(block);

    // Track recent blocks (localStorage)
    const recent = JSON.parse(
      localStorage.getItem("siteEditor.recentBlocks") || "[]",
    ) as string[];
    const updated = [
      catalog.kind,
      ...recent.filter((k) => k !== catalog.kind),
    ].slice(0, 6);
    localStorage.setItem("siteEditor.recentBlocks", JSON.stringify(updated));
  };

  const handleDragStart = (e: React.DragEvent<HTMLElement>) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "blockFromCatalog",
        kind: catalog.kind,
        defaultProps: catalog.createDefaultProps(),
      }),
    );
  };

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className="p-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-grab active:cursor-grabbing transition-colors group"
    >
      <div className="flex items-center gap-2 mb-1.5">
        {React.isValidElement(Icon) ? (
          Icon
        ) : (
          <span className="text-lg text-gray-600 group-hover:text-blue-600 w-4 h-4" />
        )}
        <span className="text-xs font-medium text-gray-900 flex-1 truncate">
          {catalog.label}
        </span>
      </div>
      <p className="text-xs text-gray-500 line-clamp-2">
        {catalog.description}
      </p>
    </div>
  );
}
