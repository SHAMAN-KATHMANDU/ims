"use client";

import React, { useMemo } from "react";
import { useEditorStore } from "../../store/editor-store";
import { selectBlocks, selectSelectedId } from "../../store/selectors";
import { TreeNode } from "./TreeNode";

export function TreePanel() {
  const blocks = useEditorStore(selectBlocks);
  const selectedId = useEditorStore(selectSelectedId);

  const isEmpty = useMemo(() => !blocks || blocks.length === 0, [blocks]);

  if (isEmpty) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <p className="text-sm text-gray-500 mb-3">No blocks yet</p>
        <p className="text-xs text-gray-400">
          Drag a block from the Blocks panel or press &quot;/&quot; to start
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="space-y-0.5">
        {blocks.map((block) => (
          <TreeNode
            key={block.id}
            block={block}
            isSelected={block.id === selectedId}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}
