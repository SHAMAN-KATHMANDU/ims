import { describe, it, expect } from "vitest";
import { resolveDropZone } from "./dropZones";

const SQUARE = { x: 0, y: 0, width: 200, height: 200 };
// height (300) > 2*width (100) → tall
const TALL = { x: 0, y: 0, width: 100, height: 300 };

describe("resolveDropZone — vertical edges win first", () => {
  it("returns 'top' when pointer is in the top 20% (≤ y=40 for 200h)", () => {
    const r = resolveDropZone({
      pointerX: 100,
      pointerY: 10,
      targetRect: SQUARE,
      isContainer: false,
    });
    expect(r.zone).toBe("top");
    // Indicator rect is the top edge band.
    expect(r.rect).toEqual({ x: 0, y: 0, width: 200, height: 40 });
  });

  it("returns 'bottom' when pointer is in the bottom 20%", () => {
    const r = resolveDropZone({
      pointerX: 100,
      pointerY: 190,
      targetRect: SQUARE,
      isContainer: false,
    });
    expect(r.zone).toBe("bottom");
    expect(r.rect).toEqual({ x: 0, y: 160, width: 200, height: 40 });
  });

  it("boundary at 19% (38px of 200) is still top", () => {
    const r = resolveDropZone({
      pointerX: 100,
      pointerY: 38,
      targetRect: SQUARE,
      isContainer: false,
    });
    expect(r.zone).toBe("top");
  });

  it("boundary at 20% (40px of 200) leaves the top zone (container target)", () => {
    // strict less-than → 40 is NOT in top; on a container we land in 'inside'.
    // (For a leaf the leaf-fallback would split 50/50 and still say "top",
    // which is the correct UX — there's no neutral zone on a leaf.)
    const r = resolveDropZone({
      pointerX: 100,
      pointerY: 40,
      targetRect: SQUARE,
      isContainer: true,
    });
    expect(r.zone).toBe("inside");
  });
});

describe("resolveDropZone — side edges (non-tall blocks)", () => {
  it("returns 'left' on a square block when pointer is in left 20%", () => {
    const r = resolveDropZone({
      pointerX: 10,
      pointerY: 100, // mid-Y, not in top/bottom band
      targetRect: SQUARE,
      isContainer: false,
    });
    expect(r.zone).toBe("left");
    expect(r.rect).toEqual({ x: 0, y: 0, width: 40, height: 200 });
  });

  it("returns 'right' on a square block when pointer is in right 20%", () => {
    const r = resolveDropZone({
      pointerX: 190,
      pointerY: 100,
      targetRect: SQUARE,
      isContainer: false,
    });
    expect(r.zone).toBe("right");
    expect(r.rect).toEqual({ x: 160, y: 0, width: 40, height: 200 });
  });
});

describe("resolveDropZone — tall blocks collapse L/R into T/B", () => {
  it("does not return 'left' on a tall block; falls back to top/bottom", () => {
    const r = resolveDropZone({
      pointerX: 5, // would be left zone if not tall
      pointerY: 150, // mid-Y
      targetRect: TALL,
      isContainer: false,
    });
    expect(r.zone).not.toBe("left");
    expect(r.zone).not.toBe("right");
  });

  it("still returns top/bottom for vertical-edge pointers on tall blocks", () => {
    expect(
      resolveDropZone({
        pointerX: 50,
        pointerY: 5,
        targetRect: TALL,
        isContainer: false,
      }).zone,
    ).toBe("top");
    expect(
      resolveDropZone({
        pointerX: 50,
        pointerY: 290,
        targetRect: TALL,
        isContainer: false,
      }).zone,
    ).toBe("bottom");
  });
});

describe("resolveDropZone — center / inside", () => {
  it("returns 'inside' on a container in the center", () => {
    const r = resolveDropZone({
      pointerX: 100,
      pointerY: 100,
      targetRect: SQUARE,
      isContainer: true,
    });
    expect(r.zone).toBe("inside");
    expect(r.rect).toEqual(SQUARE);
  });

  it("falls back to top/bottom (not 'inside') for leaf blocks in the center", () => {
    const upper = resolveDropZone({
      pointerX: 100,
      pointerY: 80, // above center, NOT in top edge
      targetRect: SQUARE,
      isContainer: false,
    });
    expect(upper.zone).toBe("top");
    const lower = resolveDropZone({
      pointerX: 100,
      pointerY: 120,
      targetRect: SQUARE,
      isContainer: false,
    });
    expect(lower.zone).toBe("bottom");
  });
});

describe("resolveDropZone — edge-px clamping", () => {
  it("clamps the edge band to MIN_EDGE_PX (6) on tiny blocks", () => {
    // 20px tall → 20% = 4, clamped up to 6.
    const r = resolveDropZone({
      pointerX: 50,
      pointerY: 5,
      targetRect: { x: 0, y: 0, width: 100, height: 20 },
      isContainer: false,
    });
    expect(r.zone).toBe("top");
    expect(r.rect.height).toBe(6);
  });

  it("clamps the edge band to MAX_EDGE_PX (80) on huge blocks", () => {
    // 1000px tall → 20% = 200, clamped down to 80.
    const r = resolveDropZone({
      pointerX: 500,
      pointerY: 50,
      targetRect: { x: 0, y: 0, width: 1000, height: 1000 },
      isContainer: false,
    });
    expect(r.zone).toBe("top");
    expect(r.rect.height).toBe(80);
  });
});
