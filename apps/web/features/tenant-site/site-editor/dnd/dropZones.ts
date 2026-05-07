/**
 * Drop zone resolver for Notion-style four-edge drop targets.
 *
 * Given a pointer position and the bounding rect of a hovered block, decide
 * which "zone" the pointer is in: top/bottom/left/right (for siblings or wraps)
 * or inside (for children on containers). Returns the visible rect of that zone
 * so the editor can paint a drop indicator.
 *
 * Pure rect arithmetic. No DOM access. Coordinates in CSS pixels.
 */

export type DropZone = "top" | "bottom" | "left" | "right" | "inside";

export interface DropTargetInput {
  pointerX: number;
  pointerY: number;
  targetRect: { x: number; y: number; width: number; height: number };
  isContainer: boolean;
}

export interface DropTargetResult {
  zone: DropZone;
  rect: { x: number; y: number; width: number; height: number };
}

const EDGE_FRACTION = 0.2; // 20% of each edge
const TALL_RATIO = 2; // height > 2 * width => collapse L/R
const MIN_EDGE_PX = 6; // never let an edge zone shrink below this
const MAX_EDGE_PX = 80; // never let an edge zone grow past this

function clamp(value: number, lo: number, hi: number): number {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

/**
 * Resolve the drop zone for a pointer over a target block.
 * Always returns a result — pointer-outside-rect callers should check bounds first.
 */
export function resolveDropZone(input: DropTargetInput): DropTargetResult {
  const { pointerX, pointerY, targetRect, isContainer } = input;
  const { x, y, width, height } = targetRect;

  const edgeY = clamp(height * EDGE_FRACTION, MIN_EDGE_PX, MAX_EDGE_PX);
  const edgeX = clamp(width * EDGE_FRACTION, MIN_EDGE_PX, MAX_EDGE_PX);

  const relX = pointerX - x;
  const relY = pointerY - y;

  const isTall = height > width * TALL_RATIO;

  // Top / bottom edges win first — pointer high or low always means sibling.
  if (relY < edgeY) {
    return {
      zone: "top",
      rect: { x, y, width, height: edgeY },
    };
  }
  if (relY > height - edgeY) {
    return {
      zone: "bottom",
      rect: { x, y: y + height - edgeY, width, height: edgeY },
    };
  }

  // Side edges only on non-tall blocks.
  if (!isTall) {
    if (relX < edgeX) {
      return {
        zone: "left",
        rect: { x, y, width: edgeX, height },
      };
    }
    if (relX > width - edgeX) {
      return {
        zone: "right",
        rect: { x: x + width - edgeX, y, width: edgeX, height },
      };
    }
  }

  // Center — "inside" only for containers; leaf blocks fall back to closer of T/B.
  if (isContainer) {
    return {
      zone: "inside",
      rect: { x, y, width, height },
    };
  }

  // Leaf fallback: bias to whichever vertical half the pointer is in.
  const center = y + height / 2;
  if (pointerY < center) {
    return {
      zone: "top",
      rect: { x, y, width, height: edgeY },
    };
  }
  return {
    zone: "bottom",
    rect: { x, y: y + height - edgeY, width, height: edgeY },
  };
}
