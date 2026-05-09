"use client";

import type { BlockNode } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";
import { selectUpdateBlockProps } from "../store/selectors";

interface BlockTabProps {
  block: BlockNode | undefined;
}

export function BlockTab({ block }: BlockTabProps) {
  const updateBlockProps = useEditorStore(selectUpdateBlockProps);

  if (!block) {
    return (
      <div
        className="p-3.5 text-xs text-center"
        style={{ color: "var(--ink-4)" }}
      >
        Select a block to edit its properties.
      </div>
    );
  }

  const blockType = block.kind.charAt(0).toUpperCase() + block.kind.slice(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = block.props as any;

  const renderBlockProperties = () => {
    switch (block.kind) {
      case "heading": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const heading = props as any;
        return (
          <>
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                Text
              </div>
              <input
                type="text"
                value={heading.text || ""}
                onChange={(e) =>
                  updateBlockProps(block.id, { text: e.target.value })
                }
                className="w-full h-7 px-2 rounded text-xs"
                style={{
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--bg-elev)",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                Level
              </div>
              <select
                value={String(heading.level || 2)}
                onChange={(e) =>
                  updateBlockProps(block.id, {
                    level: parseInt(e.target.value) as 1 | 2 | 3,
                  })
                }
                className="w-full h-7 px-2 rounded text-xs"
                style={{
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--bg-elev)",
                  color: "var(--ink)",
                }}
              >
                <option value="1">H1</option>
                <option value="2">H2</option>
                <option value="3">H3</option>
              </select>
            </div>
          </>
        );
      }
      case "rich-text": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const richText = props as any;
        return (
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
              Text content
            </div>
            <textarea
              value={richText.text || ""}
              onChange={(e) =>
                updateBlockProps(block.id, { text: e.target.value })
              }
              rows={3}
              className="w-full p-2 rounded text-xs"
              style={{
                border: "1px solid var(--line)",
                backgroundColor: "var(--bg-elev)",
                color: "var(--ink)",
                outline: "none",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>
        );
      }
      case "button": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const button = props as any;
        return (
          <>
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                Label
              </div>
              <input
                type="text"
                value={button.label || ""}
                onChange={(e) =>
                  updateBlockProps(block.id, { label: e.target.value })
                }
                className="w-full h-7 px-2 rounded text-xs"
                style={{
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--bg-elev)",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                URL
              </div>
              <input
                type="text"
                value={button.href || ""}
                onChange={(e) =>
                  updateBlockProps(block.id, { href: e.target.value })
                }
                className="w-full h-7 px-2 rounded text-xs"
                style={{
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--bg-elev)",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                Style
              </div>
              <select
                value={button.style || "primary"}
                onChange={(e) =>
                  updateBlockProps(block.id, {
                    style: e.target.value as "primary" | "outline" | "ghost",
                  })
                }
                className="w-full h-7 px-2 rounded text-xs"
                style={{
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--bg-elev)",
                  color: "var(--ink)",
                }}
              >
                <option value="primary">Primary</option>
                <option value="outline">Outline</option>
                <option value="ghost">Ghost</option>
              </select>
            </div>
          </>
        );
      }
      case "image": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const image = props as any;
        return (
          <>
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                Image URL
              </div>
              <input
                type="text"
                value={image.src || ""}
                onChange={(e) =>
                  updateBlockProps(block.id, { src: e.target.value })
                }
                className="w-full h-7 px-2 rounded text-xs"
                style={{
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--bg-elev)",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                Alt text
              </div>
              <input
                type="text"
                value={image.alt || ""}
                onChange={(e) =>
                  updateBlockProps(block.id, { alt: e.target.value })
                }
                className="w-full h-7 px-2 rounded text-xs"
                style={{
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--bg-elev)",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </div>
          </>
        );
      }
      default:
        return (
          <div className="text-xs" style={{ color: "var(--ink-3)" }}>
            No specific properties for {block.kind} blocks yet.
          </div>
        );
    }
  };

  return (
    <div
      className="p-3.5 flex flex-col gap-3.5"
      style={{
        backgroundColor: "var(--bg)",
      }}
    >
      {/* Block type heading */}
      <div>
        <div
          className="text-xs font-mono font-semibold uppercase tracking-wider"
          style={{ color: "var(--ink-4)" }}
        >
          {blockType} block
        </div>
      </div>

      {/* Block-specific properties */}
      {renderBlockProperties()}
    </div>
  );
}
