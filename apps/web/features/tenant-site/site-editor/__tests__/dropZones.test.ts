import { describe, it, expect } from "vitest";
import { resolveDropZone, type DropTargetInput } from "../dnd/dropZones";

describe("dropZones", () => {
  const rect = { x: 0, y: 0, width: 200, height: 100 };

  describe("top zone", () => {
    it("resolves pointer in top 20% as top", () => {
      const input: DropTargetInput = {
        pointerX: 100,
        pointerY: 10,
        targetRect: rect,
        isContainer: false,
      };
      const result = resolveDropZone(input);
      expect(result.zone).toBe("top");
      expect(result.rect.height).toBeLessThanOrEqual(20);
    });
  });

  describe("bottom zone", () => {
    it("resolves pointer in bottom 20% as bottom", () => {
      const input: DropTargetInput = {
        pointerX: 100,
        pointerY: 95,
        targetRect: rect,
        isContainer: false,
      };
      const result = resolveDropZone(input);
      expect(result.zone).toBe("bottom");
      expect(result.rect.height).toBeLessThanOrEqual(20);
    });
  });

  describe("left zone", () => {
    it("resolves pointer in left 20% as left on non-tall blocks", () => {
      const input: DropTargetInput = {
        pointerX: 20,
        pointerY: 50,
        targetRect: rect,
        isContainer: false,
      };
      const result = resolveDropZone(input);
      expect(result.zone).toBe("left");
    });
  });

  describe("right zone", () => {
    it("resolves pointer in right 20% as right on non-tall blocks", () => {
      const input: DropTargetInput = {
        pointerX: 180,
        pointerY: 50,
        targetRect: rect,
        isContainer: false,
      };
      const result = resolveDropZone(input);
      expect(result.zone).toBe("right");
    });
  });

  describe("inside zone", () => {
    it("resolves center pointer to inside for containers", () => {
      const input: DropTargetInput = {
        pointerX: 100,
        pointerY: 50,
        targetRect: rect,
        isContainer: true,
      };
      const result = resolveDropZone(input);
      expect(result.zone).toBe("inside");
    });

    it("resolves center pointer to top/bottom for leaf blocks", () => {
      const input: DropTargetInput = {
        pointerX: 100,
        pointerY: 30,
        targetRect: rect,
        isContainer: false,
      };
      const result = resolveDropZone(input);
      expect(["top", "bottom"]).toContain(result.zone);
    });

    it("biases leaf blocks to top when pointer is in upper half", () => {
      const input: DropTargetInput = {
        pointerX: 100,
        pointerY: 40,
        targetRect: rect,
        isContainer: false,
      };
      const result = resolveDropZone(input);
      expect(result.zone).toBe("top");
    });

    it("biases leaf blocks to bottom when pointer is in lower half", () => {
      const input: DropTargetInput = {
        pointerX: 100,
        pointerY: 60,
        targetRect: rect,
        isContainer: false,
      };
      const result = resolveDropZone(input);
      expect(result.zone).toBe("bottom");
    });
  });

  describe("tall block behavior", () => {
    const tallRect = { x: 0, y: 0, width: 100, height: 300 }; // height > 2*width

    it("collapses left/right zones on tall blocks", () => {
      const leftInput: DropTargetInput = {
        pointerX: 20,
        pointerY: 150,
        targetRect: tallRect,
        isContainer: false,
      };
      const result = resolveDropZone(leftInput);
      expect(result.zone).not.toBe("left");
      expect(result.zone).not.toBe("right");
    });

    it("still allows top/bottom on tall blocks", () => {
      const topInput: DropTargetInput = {
        pointerX: 50,
        pointerY: 10,
        targetRect: tallRect,
        isContainer: false,
      };
      const result = resolveDropZone(topInput);
      expect(result.zone).toBe("top");
    });
  });

  describe("edge clamping", () => {
    it("clamps minimum edge size to 6px", () => {
      const smallRect = { x: 0, y: 0, width: 10, height: 10 };
      const input: DropTargetInput = {
        pointerX: 5,
        pointerY: 2,
        targetRect: smallRect,
        isContainer: false,
      };
      const result = resolveDropZone(input);
      expect(result.zone).toBe("top");
      expect(result.rect.height).toBeGreaterThanOrEqual(6);
    });

    it("clamps maximum edge size to 80px", () => {
      const largeRect = { x: 0, y: 0, width: 1000, height: 1000 };
      const input: DropTargetInput = {
        pointerX: 50,
        pointerY: 50,
        targetRect: largeRect,
        isContainer: false,
      };
      const result = resolveDropZone(input);
      expect(result.zone).toBe("top");
      expect(result.rect.height).toBeLessThanOrEqual(80);
    });
  });

  describe("zone rect accuracy", () => {
    it("returns correct rect bounds for each zone", () => {
      const input: DropTargetInput = {
        pointerX: 100,
        pointerY: 10,
        targetRect: rect,
        isContainer: false,
      };
      const result = resolveDropZone(input);
      expect(result.rect.x).toBe(0);
      expect(result.rect.y).toBe(0);
      expect(result.rect.width).toBe(200);
    });

    it("includes offset in rect calculations", () => {
      const offsetRect = { x: 100, y: 200, width: 300, height: 150 };
      const input: DropTargetInput = {
        pointerX: 150,
        pointerY: 210,
        targetRect: offsetRect,
        isContainer: false,
      };
      const result = resolveDropZone(input);
      expect(result.rect.x).toBe(100);
      expect(result.rect.y).toBe(200);
    });
  });
});
