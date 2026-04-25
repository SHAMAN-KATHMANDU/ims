"use client";

/**
 * EditorPreviewShell — client-side shell that enables live prop propagation
 * (Bug #3) in the site editor preview iframe.
 *
 * The parent PreviewFrame posts `{ type: 'editor:block-tree', tree }` messages
 * (debounced ~150 ms) whenever the editor store's block tree changes. This
 * component listens for that message and re-renders the block tree immediately
 * — without a full iframe reload — so inspector toggles (showPrice, columns,
 * cardAspectRatio, …) are visible within ~150 ms of the user's action.
 *
 * Used only when the preview page detects `?_editor=1` (the flag that
 * PreviewFrame appends to the iframe src). For regular public traffic the
 * preview page renders via the server-only BlockRenderer directly.
 *
 * The `dataContext` (products, categories, nav, site config) is fetched once
 * server-side and passed in as `initialDataContext`. Block components read it
 * via props, so no refetch is needed when the tree updates.
 */

import { useState, useEffect } from "react";
import type { BlockNode } from "@repo/shared";
import { BlockRenderer } from "./BlockRenderer";
import type { BlockDataContext } from "./data-context";

interface Props {
  initialBlocks: BlockNode[];
  dataContext: BlockDataContext;
}

export function EditorPreviewShell({ initialBlocks, dataContext }: Props) {
  const [blocks, setBlocks] = useState<BlockNode[]>(initialBlocks);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "editor:block-tree" && Array.isArray(e.data.tree)) {
        setBlocks(e.data.tree as BlockNode[]);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return <BlockRenderer nodes={blocks} dataContext={dataContext} />;
}
