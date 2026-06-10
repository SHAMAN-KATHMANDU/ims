"use client";

import { useEffect, useRef, useState } from "react";
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

/**
 * Inline-editable text block (heading / rich-text).
 *
 * The contentEditable DOM is the source of truth WHILE FOCUSED: we push
 * edits into the store but render from a `frozen` copy of the props that
 * only re-syncs when the element is not focused. Rendering the live store
 * text would make React rewrite the text node on every keystroke, which
 * resets the caret to position 0 — typing "Hello" produced "olleH".
 */
function EditableTextBlock({
  block,
  dataContext,
  textProp,
}: BlockViewProps & { textProp: "text" | "source" }) {
  const { updateBlockProps } = useEditorStore();
  const setSlashMenuAnchor = useEditorStore(selectSetSlashMenuAnchor);
  const ref = useRef<HTMLDivElement>(null);
  const [frozen, setFrozen] = useState(block.props);

  // Sync external changes (undo, inspector edits) into the rendered copy —
  // but never while the user is typing in this block.
  useEffect(() => {
    const el = ref.current;
    const focused =
      el !== null &&
      (el === document.activeElement || el.contains(document.activeElement));
    if (!focused) setFrozen(block.props);
  }, [block.props]);

  const entry = blockRegistry[block.kind];
  if (!entry) return null;
  const Component = entry.component;

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    let text = e.currentTarget.innerText;
    if (text.startsWith("/")) {
      // Open the slash menu anchored at the caret, and strip the "/" both
      // from the DOM and from what we persist. When no selection range is
      // available (programmatic input, some mobile IMEs), anchor at the
      // block itself rather than silently not opening.
      const selection = document.getSelection();
      const rect =
        selection && selection.rangeCount > 0
          ? selection.getRangeAt(0).getBoundingClientRect()
          : e.currentTarget.getBoundingClientRect();
      setSlashMenuAnchor({
        blockId: block.id,
        position: { x: rect.left, y: rect.top },
      });
      text = text.slice(1);
      e.currentTarget.innerText = text;
    }
    updateBlockProps(
      block.id,
      (textProp === "text" ? { text } : { source: text }) as Partial<
        BlockNode["props"]
      >,
    );
  };

  const frozenNode = { ...block, props: frozen };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const frozenProps = frozen as any;

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
    >
      <Component
        node={frozenNode}
        props={frozenProps}
        dataContext={dataContext}
      />
    </div>
  );
}

export function BlockView({ block, dataContext }: BlockViewProps) {
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

  // Special handling for contentEditable blocks: heading and rich-text.
  // The rich-text schema's strict() object only accepts `source` (markdown);
  // writing `text` used to throw "Unrecognized key(s)" on autosave.
  if (block.kind === "heading") {
    return (
      <EditableTextBlock
        block={block}
        dataContext={dataContext}
        textProp="text"
      />
    );
  }

  if (block.kind === "rich-text") {
    return (
      <EditableTextBlock
        block={block}
        dataContext={dataContext}
        textProp="source"
      />
    );
  }

  // For all other kinds, render the component
  return (
    <Component node={block} props={block.props} dataContext={dataContext}>
      {childrenElement}
    </Component>
  );
}
