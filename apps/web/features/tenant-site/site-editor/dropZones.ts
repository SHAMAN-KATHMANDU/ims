/**
 * dropZones — geometry helper for Notion-style four-edge drop targets.
 *
 * Given a pointer position and the bounding rect of a hovered block, decide
 * which "zone" the pointer is in and return the visible rect of that zone
 * so the editor can paint a drop indicator. The semantics:
 *
 *     ┌─────────────── top (sibling above) ───────────────┐
 *     │┌──┐┌──────────────────────────────┐┌─────────────┐│
 *     ││L ││                              ││             ││
 *     ││e ││                              ││             ││
 *     ││f ││            inside            ││    right    ││
 *     ││t ││         (children of         ││  (wrap in   ││
 *     ││  ││         a container)         ││    row)     ││
 *     ││  ││                              ││             ││
 *     │└──┘└──────────────────────────────┘└─────────────┘│
 *     └────────── bottom (sibling below) ─────────────────┘
 *
 * - Top / bottom 20% of height → insert sibling above / below.
 * - Left / right 20% of width → wrap the target with a row, placing the
 *   dragged block on that side.
 * - Center 60×60% → insert inside, but ONLY when the target is a container
 *   kind. For leaf blocks we fall through to the closer of top/bottom.
 *
 * For "tall" blocks (height > 2× width) we collapse the left/right zones
 * into top/bottom, because side-drops on a tall column feel wrong.
 *
 * Zero deps. No DOM access. Pure rect arithmetic. Coordinates in CSS pixels
 * within whatever container's frame the rect was measured in (typically the
 * iframe's contentDocument; the indicator overlay handles the translation).
 */

export type DropZone = "top" | "bottom" | "left" | "right" | "inside";

export interface DropTargetInput {
  /** Pointer position in the same coord space as `targetRect`. */
  pointerX: number;
  pointerY: number;
  /** The hovered block's bounding rect (CSS pixels). */
  targetRect: { x: number; y: number; width: number; height: number };
  /** Whether the hovered block is a container (gates the "inside" zone). */
  isContainer: boolean;
}

export interface DropTargetResult {
  zone: DropZone;
  /** Visible rect of the chosen zone (for painting an indicator). */
  rect: { x: number; y: number; width: number; height: number };
}

const EDGE_FRACTION = 0.2; // 20% of each edge
const TALL_RATIO = 2; // height > 2 * width => collapse L/R
const MIN_EDGE_PX = 6; // never let an edge zone shrink below this
const MAX_EDGE_PX = 80; // never let an edge zone grow past this

/**
 * Resolve the drop zone for a pointer over a target block. Always returns
 * a result — pointer-outside-rect callers should compare bounds before
 * invoking this.
 */
export function resolveDropZone(input: DropTargetInput): DropTargetResult {
  const { pointerX, pointerY, targetRect, isContainer } = input;
  const { x, y, width, height } = targetRect;

  const edgeY = clamp(height * EDGE_FRACTION, MIN_EDGE_PX, MAX_EDGE_PX);
  const edgeX = clamp(width * EDGE_FRACTION, MIN_EDGE_PX, MAX_EDGE_PX);

  const relX = pointerX - x;
  const relY = pointerY - y;

  // Tall blocks: collapse L/R into T/B so a tall column feels natural.
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

  // Center — "inside" only for containers; leaf blocks fall back to the
  // closer of top/bottom to avoid a "no-op" zone in the middle of a card.
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

function clamp(value: number, lo: number, hi: number): number {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}
