"use client";

import type { BlockNode } from "@repo/shared";
import {
  blockRegistry,
  BlockRenderer,
  type BlockDataContext,
} from "@repo/blocks";
import { useEditorStore } from "../store/editor-store";
import { selectSetSlashMenuAnchor } from "../store/selectors";

interface BlockViewProps {
  block: BlockNode;
  dataContext: BlockDataContext;
}

export function BlockView({ block, dataContext }: BlockViewProps) {
  const { updateBlockProps } = useEditorStore();
  const setSlashMenuAnchor = useEditorStore(selectSetSlashMenuAnchor);

  const handleSlashMenuTrigger = (e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.innerText;
    if (text.startsWith("/")) {
      const selection = document.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSlashMenuAnchor({
          blockId: block.id,
          position: { x: rect.left, y: rect.top },
        });
        e.currentTarget.innerText = text.slice(1);
      }
    }
  };

  // Check if this kind has a registered renderer
  const entry = blockRegistry[block.kind];

  if (!entry) {
    // Unknown kind: render a placeholder
    return (
      <div
        style={{
          padding: "12px",
          borderRadius: "4px",
          backgroundColor: "var(--bg-sunken)",
          color: "var(--ink-4)",
          fontSize: "12px",
          border: "1px dashed var(--line)",
        }}
      >
        ⚠️ {block.kind}: unknown block kind
      </div>
    );
  }

  const Component = entry.component;
  const isContainer = entry.container ?? false;

  // Wrap children with BlockRenderer for container kinds
  const childrenElement =
    isContainer && block.children && block.children.length > 0 ? (
      <BlockRenderer nodes={block.children} dataContext={dataContext} />
    ) : null;

  // Special handling for contentEditable blocks: heading and rich-text
  if (block.kind === "heading") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = block.props as any;

    return (
      <div
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          const innerText = e.currentTarget.innerText;
          handleSlashMenuTrigger(e);
          updateBlockProps(block.id, {
            text: innerText,
          });
        }}
      >
        <Component node={block} props={props} dataContext={dataContext} />
      </div>
    );
  }

  if (block.kind === "rich-text") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = block.props as any;

    return (
      <div
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => {
          const innerText = e.currentTarget.innerText;
          handleSlashMenuTrigger(e);
          updateBlockProps(block.id, {
            text: innerText,
          });
        }}
      >
        <Component node={block} props={props} dataContext={dataContext} />
      </div>
    );
  }

  // For all other kinds, render the component
  return (
    <Component node={block} props={block.props} dataContext={dataContext}>
      {childrenElement}
    </Component>
  );
}
