"use client";

import type { BlockNode } from "@repo/shared";
import { useEditorStore } from "../store/editor-store";

interface BlockTabProps {
  block: BlockNode | undefined;
}

export function BlockTab({ block }: BlockTabProps) {
  const { updateBlockProps } = useEditorStore();

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

      {/* Padding slider */}
      <div>
        <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
          Padding
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="50"
            className="flex-1"
            style={{ accentColor: "var(--accent)" }}
          />
          <span
            className="text-xs font-mono w-8 text-right"
            style={{ color: "var(--ink-3)" }}
          >
            50px
          </span>
        </div>
      </div>

      {/* Background color section */}
      <div>
        <div className="text-xs mb-2" style={{ color: "var(--ink-3)" }}>
          Background
        </div>
        <div className="flex gap-1.5">
          {[
            "transparent",
            "var(--bg-sunken)",
            "var(--ink)",
            "var(--accent-soft)",
          ].map((color, i) => (
            <button
              key={i}
              className="flex-1 h-7 rounded"
              style={{
                backgroundColor: color,
                border: "1px solid var(--line)",
                backgroundImage:
                  color === "transparent"
                    ? "linear-gradient(45deg, var(--line) 25%, transparent 25%, transparent 75%, var(--line) 75%)"
                    : "none",
                backgroundSize: color === "transparent" ? "8px 8px" : "auto",
              }}
            />
          ))}
        </div>
      </div>

      {/* Alignment */}
      <div>
        <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
          Alignment
        </div>
        <div
          className="flex gap-1 p-0.5 rounded"
          style={{
            backgroundColor: "var(--bg-sunken)",
            border: "1px solid var(--line)",
          }}
        >
          {["Left", "Center", "Right"].map((align) => (
            <button
              key={align}
              className="flex-1 h-5 rounded text-xs"
              style={{
                backgroundColor:
                  align === "Left" ? "var(--bg-elev)" : "transparent",
                color: align === "Left" ? "var(--ink)" : "var(--ink-3)",
                boxShadow: align === "Left" ? "var(--shadow-sm)" : "none",
              }}
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-1.5">
        {["Hide on mobile", "Animate on scroll"].map((label) => (
          <button
            key={label}
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--ink-2)" }}
          >
            <div
              className="w-6 h-3.5 rounded-full"
              style={{
                backgroundColor: "var(--line-strong)",
                transition: "background-color 120ms",
              }}
            >
              <div
                style={{
                  width: "11px",
                  height: "11px",
                  borderRadius: "999px",
                  background: "white",
                  position: "relative",
                  left: "1.5px",
                  top: "1.5px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  transition: "left 120ms",
                }}
              />
            </div>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
