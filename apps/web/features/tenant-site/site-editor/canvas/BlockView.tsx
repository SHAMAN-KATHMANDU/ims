"use client";

import type { BlockNode } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import { selectSetSlashMenuAnchor } from "../store/selectors";

interface BlockViewProps {
  block: BlockNode;
}

export function BlockView({ block }: BlockViewProps) {
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

  // Simple contentEditable support for heading/rich-text
  if (block.kind === "heading") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = block.props as any;
    const level = props.level || 2;
    const text = props.text || "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sizeMap: Record<number, any> = {
      1: {
        fontSize: "38px",
        fontWeight: 600,
        marginTop: "18px",
        marginBottom: "6px",
      },
      2: {
        fontSize: "26px",
        fontWeight: 600,
        marginTop: "24px",
        marginBottom: "6px",
      },
      3: {
        fontSize: "18px",
        fontWeight: 600,
        marginTop: "18px",
        marginBottom: "4px",
      },
    };
    const size = sizeMap[level] || sizeMap[2];

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
        style={{
          ...size,
          outline: "none",
          color: "var(--ink)",
          fontFamily: "georgia, serif",
          lineHeight: 1.2,
          letterSpacing:
            level === 1 ? "-0.8px" : level === 2 ? "-0.4px" : "-0.2px",
        }}
      >
        {text}
      </div>
    );
  }

  if (block.kind === "rich-text") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = block.props as any;
    const text = props.text || "";

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
        style={{
          margin: "6px 0",
          fontSize: "16px",
          lineHeight: 1.7,
          color: "var(--ink-2)",
          fontFamily: "georgia, serif",
          outline: "none",
        }}
      >
        {text}
      </div>
    );
  }

  if (block.kind === "divider") {
    return (
      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--line)",
          margin: "20px 0",
        }}
      />
    );
  }

  if (block.kind === "spacer") {
    return <div style={{ height: "40px" }} />;
  }

  if (block.kind === "image") {
    return (
      <figure style={{ margin: "16px 0" }}>
        <div
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            background:
              "linear-gradient(135deg, oklch(0.45 0.06 50), oklch(0.32 0.05 30))",
            borderRadius: "6px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              left: "12px",
              color: "white",
              fontSize: "11px",
              opacity: 0.8,
              fontFamily: "monospace",
              letterSpacing: "0.4px",
              textTransform: "uppercase",
            }}
          >
            image · 1600 × 900
          </div>
        </div>
      </figure>
    );
  }

  if (block.kind === "section") {
    return (
      <div
        style={{
          padding: "32px 0",
          borderRadius: "6px",
          backgroundColor: "var(--bg-sunken)",
          minHeight: "80px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-4)",
          fontSize: "13px",
        }}
      >
        Section
      </div>
    );
  }

  if (block.kind === "row") {
    return (
      <div
        style={{
          padding: "16px",
          borderRadius: "6px",
          backgroundColor: "var(--bg-sunken)",
          minHeight: "80px",
          display: "flex",
          gap: "16px",
          color: "var(--ink-4)",
          fontSize: "13px",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Row layout
      </div>
    );
  }

  // Fallback
  return (
    <div
      style={{
        padding: "12px",
        borderRadius: "4px",
        backgroundColor: "var(--bg-sunken)",
        color: "var(--ink-4)",
        fontSize: "12px",
      }}
    >
      {block.kind}: (not yet rendered)
    </div>
  );
}
