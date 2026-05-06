"use client";

/**
 * NotionDnDOverlay — Notion-style four-edge drop indicator overlay.
 *
 * Portaled into the iframe body alongside the existing top-level
 * `BlockOverlay`. Lights up per-block drop targets at every nesting depth:
 *
 *   - top/bottom 20%  → insert sibling above / below the hovered block
 *   - left/right 20%  → wrap the hovered block in a `row` container with
 *                       the new block on the chosen side
 *   - center 60×60%   → insert as a child (only when the hovered block is a
 *                       container kind — section / row / columns / css-grid)
 *
 * Geometry comes from `dropZones.resolveDropZone`; mutation dispatch is via
 * the callbacks the parent (PreviewFrame) wires into the editor store.
 *
 * Render strategy
 * ---------------
 * Per block we render a single invisible div that captures pointer events
 * (drag-over, drop, drag-leave). On drag-over we read the current zone and
 * paint **one** indicator div positioned over that edge; no per-edge DOM
 * children. This keeps the DOM small (1 + N elements for N blocks) and
 * lets CSS styling stay simple.
 *
 * Same-origin only — the iframe portal requires DOM access. Gated upstream
 * by `EnvFeature.NOTION_STYLE_EDITOR`.
 */

import { useEffect, useRef, useState } from "react";
import {
  resolveDropZone,
  type DropTargetResult,
  type DropZone,
  CONTAINER_KINDS,
} from "@/lib/block-tree";
import type { BlockKind } from "@repo/shared";

interface BlockMeta {
  id: string;
  kind: BlockKind;
  isContainer: boolean;
  // Iframe-document coords (already scroll-adjusted).
  top: number;
  left: number;
  width: number;
  height: number;
}

const DRAG_PAYLOAD_REORDER = "application/x-editor-reorder";
const DRAG_PAYLOAD_KIND = "block-kind";

export interface NotionDnDOverlayProps {
  /** All blocks currently visible in the iframe, at every depth. */
  blocks: BlockMeta[];
  /**
   * Called when the user drops a block onto a sibling-edge target.
   *
   * @param dragKind  When dragging from the palette (insert): the block kind to create.
   * @param dragId    When dragging an existing canvas block (move): its id.
   * @param anchorId  The hovered block id.
   * @param where     Whether to insert before / after the anchor.
   */
  onSiblingDrop: (params: {
    dragKind: string | null;
    dragId: string | null;
    anchorId: string;
    where: "before" | "after";
  }) => void;
  onWrapInRow: (params: {
    dragKind: string | null;
    dragId: string | null;
    anchorId: string;
    side: "left" | "right";
  }) => void;
  onChildDrop: (params: {
    dragKind: string | null;
    dragId: string | null;
    parentId: string;
  }) => void;
}

interface ActiveTarget {
  blockId: string;
  zone: DropZone;
  rect: { x: number; y: number; width: number; height: number };
}

export function NotionDnDOverlay({
  blocks,
  onSiblingDrop,
  onWrapInRow,
  onChildDrop,
}: NotionDnDOverlayProps) {
  const [active, setActive] = useState<ActiveTarget | null>(null);

  // Wipe the active target if the dragged drop session ends anywhere outside
  // a target — the browser doesn't always fire dragleave on the right element.
  useEffect(() => {
    function clear() {
      setActive(null);
    }
    window.addEventListener("dragend", clear);
    window.addEventListener("drop", clear, true);
    return () => {
      window.removeEventListener("dragend", clear);
      window.removeEventListener("drop", clear, true);
    };
  }, []);

  return (
    <div
      data-editor-notion-dnd-root
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none",
        zIndex: 1000,
      }}
      aria-hidden="true"
    >
      {blocks.map((block) => (
        <BlockDropArea
          key={block.id}
          block={block}
          active={active?.blockId === block.id ? active : null}
          onActiveChange={setActive}
          onSiblingDrop={onSiblingDrop}
          onWrapInRow={onWrapInRow}
          onChildDrop={onChildDrop}
        />
      ))}
      {active && <Indicator zone={active.zone} rect={active.rect} />}
    </div>
  );
}

interface BlockDropAreaProps {
  block: BlockMeta;
  active: ActiveTarget | null;
  onActiveChange: (target: ActiveTarget | null) => void;
  onSiblingDrop: NotionDnDOverlayProps["onSiblingDrop"];
  onWrapInRow: NotionDnDOverlayProps["onWrapInRow"];
  onChildDrop: NotionDnDOverlayProps["onChildDrop"];
}

function BlockDropArea({
  block,
  active,
  onActiveChange,
  onSiblingDrop,
  onWrapInRow,
  onChildDrop,
}: BlockDropAreaProps) {
  // Throttle onActiveChange to one update per rAF tick to avoid React thrash
  // during fast pointer movement across the same block.
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<ActiveTarget | null>(null);

  const flush = () => {
    rafRef.current = null;
    onActiveChange(pendingRef.current);
  };

  const schedule = (next: ActiveTarget | null) => {
    pendingRef.current = next;
    if (rafRef.current === null) {
      rafRef.current = window.requestAnimationFrame(flush);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!hasEditorPayload(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = e.dataTransfer.types.includes(
      DRAG_PAYLOAD_REORDER,
    )
      ? "move"
      : "copy";

    const result: DropTargetResult = resolveDropZone({
      pointerX: e.clientX,
      pointerY: e.clientY,
      targetRect: {
        x: block.left,
        y: block.top,
        width: block.width,
        height: block.height,
      },
      isContainer: block.isContainer,
    });

    schedule({
      blockId: block.id,
      zone: result.zone,
      rect: result.rect,
    });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear when the cursor leaves to a non-descendant. For our flat
    // overlay this is effectively "always" — siblings each handle their own
    // dragOver. We rAF-clear so a re-enter on the next frame doesn't flicker.
    if (active?.blockId === block.id) schedule(null);
    void e;
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!hasEditorPayload(e)) return;
    e.preventDefault();
    e.stopPropagation();

    const dragId = e.dataTransfer.getData(DRAG_PAYLOAD_REORDER).trim() || null;
    const dragKind = e.dataTransfer.getData(DRAG_PAYLOAD_KIND).trim() || null;
    if (!dragId && !dragKind) {
      schedule(null);
      return;
    }

    const result: DropTargetResult = resolveDropZone({
      pointerX: e.clientX,
      pointerY: e.clientY,
      targetRect: {
        x: block.left,
        y: block.top,
        width: block.width,
        height: block.height,
      },
      isContainer: block.isContainer,
    });

    // Reject self-drop (dragging a block onto itself).
    if (dragId === block.id) {
      schedule(null);
      return;
    }

    switch (result.zone) {
      case "top":
        onSiblingDrop({
          dragKind,
          dragId,
          anchorId: block.id,
          where: "before",
        });
        break;
      case "bottom":
        onSiblingDrop({
          dragKind,
          dragId,
          anchorId: block.id,
          where: "after",
        });
        break;
      case "left":
        onWrapInRow({ dragKind, dragId, anchorId: block.id, side: "left" });
        break;
      case "right":
        onWrapInRow({ dragKind, dragId, anchorId: block.id, side: "right" });
        break;
      case "inside":
        if (block.isContainer) {
          onChildDrop({ dragKind, dragId, parentId: block.id });
        } else {
          // Defensive — shouldn't happen since resolveDropZone gates 'inside'
          // by isContainer, but a no-op is the right fallback.
        }
        break;
    }

    schedule(null);
  };

  return (
    <div
      // The drop area is a visual-presentation surface — there's no keyboard
      // equivalent for HTML5 DnD, so role="presentation" + parent
      // aria-hidden is the right a11y story here. Keyboard users use the
      // SlashMenu + ⌘↑/⌘↓ shortcuts instead.
      role="presentation"
      style={{
        position: "absolute",
        top: block.top,
        left: block.left,
        width: block.width,
        height: block.height,
        pointerEvents: "auto",
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    />
  );
}

function Indicator({
  zone,
  rect,
}: {
  zone: DropZone;
  rect: { x: number; y: number; width: number; height: number };
}) {
  // 'inside' renders a soft fill (entire block); edge zones render a 3px line
  // along the relevant edge for clarity. 'left' / 'right' use a thicker bar.
  const ACCENT = "oklch(0.62 0.08 150)";
  const ACCENT_SOFT = "oklch(0.62 0.08 150 / 0.10)";

  if (zone === "inside") {
    return (
      <div
        style={{
          position: "absolute",
          top: rect.y,
          left: rect.x,
          width: rect.width,
          height: rect.height,
          background: ACCENT_SOFT,
          outline: `2px dashed ${ACCENT}`,
          outlineOffset: -2,
          pointerEvents: "none",
          borderRadius: 4,
        }}
      />
    );
  }

  // Edge zones — paint a thin bar at the leading edge of the resolved rect.
  let style: React.CSSProperties;
  if (zone === "top") {
    style = {
      top: rect.y - 1,
      left: rect.x,
      width: rect.width,
      height: 3,
    };
  } else if (zone === "bottom") {
    style = {
      top: rect.y + rect.height - 2,
      left: rect.x,
      width: rect.width,
      height: 3,
    };
  } else if (zone === "left") {
    style = {
      top: rect.y,
      left: rect.x - 1,
      width: 3,
      height: rect.height,
    };
  } else {
    // right
    style = {
      top: rect.y,
      left: rect.x + rect.width - 2,
      width: 3,
      height: rect.height,
    };
  }

  return (
    <div
      style={{
        position: "absolute",
        background: ACCENT,
        borderRadius: 1.5,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}

/** Returns true when the drag carries one of our editor MIME types. */
function hasEditorPayload(e: React.DragEvent): boolean {
  const types = Array.from(e.dataTransfer.types ?? []);
  return (
    types.includes(DRAG_PAYLOAD_REORDER) || types.includes(DRAG_PAYLOAD_KIND)
  );
}

/** Default export for symmetry with the existing BlockOverlay component. */
export default NotionDnDOverlay;

/** Helper exposed for tests + the rect-collection hook. */
export function isContainerKind(kind: BlockKind | string | null): boolean {
  if (!kind) return false;
  return CONTAINER_KINDS.has(kind as BlockKind);
}
