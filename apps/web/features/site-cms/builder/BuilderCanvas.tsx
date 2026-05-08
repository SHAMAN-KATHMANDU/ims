"use client";

import type { JSX } from "react";
import type { BlockNode } from "@repo/shared";
import { Plus } from "lucide-react";

interface BuilderCanvasProps {
  blocks: BlockNode[];
  selectedId: string | null;
  hoveredId: string | null;
  device: "desktop" | "tablet" | "mobile";
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onAddBelow: () => void;
}

const deviceWidths: Record<"desktop" | "tablet" | "mobile", number> = {
  desktop: 1240,
  tablet: 820,
  mobile: 414,
};

export function BuilderCanvas({
  blocks,
  selectedId,
  hoveredId,
  device,
  onSelect,
  onHover,
  onAddBelow,
}: BuilderCanvasProps): JSX.Element {
  const canvasW = deviceWidths[device];

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: "32px 24px 80px",
        display: "flex",
        justifyContent: "center",
        background: "var(--bg-sunken)",
      }}
    >
      <div
        style={{
          width: canvasW,
          maxWidth: "100%",
          background: "var(--bg-elev)",
          borderRadius: device === "desktop" ? 8 : 22,
          border: "1px solid var(--line)",
          boxShadow: "var(--shadow-md)",
          overflow: "hidden",
          transition: "width 200ms",
          display: "flex",
          flexDirection: "column",
          minHeight: 600,
        }}
      >
        {/* Frame chrome */}
        <FrameChrome device={device} />

        {/* Canvas content */}
        <div
          style={{
            padding: device === "mobile" ? "20px 18px 60px" : "32px 64px 80px",
          }}
        >
          {blocks.length === 0 ? (
            <div
              style={{
                padding: "80px 20px",
                textAlign: "center",
                color: "var(--ink-4)",
                fontSize: 14,
              }}
            >
              <div style={{ marginBottom: 16 }}>No blocks yet</div>
              <button
                onClick={onAddBelow}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  color: "var(--accent)",
                  border: "1px solid var(--accent-line)",
                  borderRadius: 5,
                  background: "var(--accent-soft)",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <Plus size={14} /> Add your first block
              </button>
            </div>
          ) : (
            <>
              {blocks.map((block) => (
                <BlockPlaceholder
                  key={block.id}
                  block={block}
                  isSelected={selectedId === block.id}
                  isHovered={hoveredId === block.id}
                  onSelect={() => onSelect(block.id)}
                  onHover={(v) => onHover(v ? block.id : null)}
                />
              ))}
              <button
                type="button"
                onClick={onAddBelow}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onAddBelow();
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 12,
                  padding: "8px 12px",
                  color: "var(--ink-4)",
                  fontSize: 13,
                  borderRadius: 5,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-sunken)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <Plus size={14} /> Add block · or type{" "}
                <span className="kbd">/</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FrameChrome({ device }: { device: string }): JSX.Element {
  const widths: Record<string, string> = {
    desktop: "1240w",
    tablet: "820w",
    mobile: "414w",
  };

  return (
    <div
      style={{
        height: 32,
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 12px",
        background: "var(--bg-sunken)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", gap: 5 }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((color) => (
          <span
            key={color}
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              background: color,
              opacity: 0.6,
            }}
          />
        ))}
      </div>
      <div
        style={{
          flex: 1,
          height: 20,
          borderRadius: 4,
          background: "var(--bg)",
          border: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          fontSize: 11,
          color: "var(--ink-4)",
          fontFamily: "var(--font-mono)",
        }}
      >
        🔒 mysite.com/
      </div>
      <span
        className="mono"
        style={{
          fontSize: 10,
          color: "var(--ink-4)",
          textTransform: "uppercase",
        }}
      >
        {widths[device] || "1240w"}
      </span>
    </div>
  );
}

function BlockPlaceholder({
  block,
  isSelected,
  isHovered: _isHovered,
  onSelect,
  onHover,
}: {
  block: BlockNode;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (v: boolean) => void;
}): JSX.Element {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Block: ${block.kind}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{
        position: "relative",
        margin: "2px -16px",
        padding: "2px 16px",
        borderRadius: 4,
        background: isSelected
          ? "oklch(from var(--accent) l c h / 0.05)"
          : "transparent",
        boxShadow: isSelected ? "inset 0 0 0 1.5px var(--accent)" : "none",
        transition: "background 80ms",
      }}
    >
      <button
        style={{
          padding: "12px",
          borderRadius: 4,
          background: "var(--bg-sunken)",
          border: "1px dashed var(--line)",
          textAlign: "center",
          color: "var(--ink-4)",
          fontSize: 12,
          minHeight: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        type="button"
      >
        <span>{block.kind}</span>
      </button>
    </div>
  );
}
