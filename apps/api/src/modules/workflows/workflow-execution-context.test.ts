import { describe, it, expect } from "vitest";
import {
  MAX_WORKFLOW_NESTING_DEPTH,
  getWorkflowNestingDepth,
  shouldSkipWorkflowRules,
  runWithIncreasedWorkflowNestingDepth,
} from "./workflow-execution-context";

describe("workflow-execution-context", () => {
  describe("getWorkflowNestingDepth", () => {
    it("returns 0 outside of any workflow run scope", () => {
      expect(getWorkflowNestingDepth()).toBe(0);
    });

    it("returns 1 inside a single runWithIncreasedWorkflowNestingDepth", async () => {
      const depth = await runWithIncreasedWorkflowNestingDepth(async () =>
        getWorkflowNestingDepth(),
      );
      expect(depth).toBe(1);
    });

    it("increments with each nested run", async () => {
      const depths = await runWithIncreasedWorkflowNestingDepth(async () => {
        const outer = getWorkflowNestingDepth();
        const inner = await runWithIncreasedWorkflowNestingDepth(async () =>
          getWorkflowNestingDepth(),
        );
        const afterInner = getWorkflowNestingDepth();
        return { outer, inner, afterInner };
      });
      expect(depths.outer).toBe(1);
      expect(depths.inner).toBe(2);
      // Leaving inner scope should restore the outer depth, not add
      expect(depths.afterInner).toBe(1);
    });

    it("restores depth to 0 after the scope exits", async () => {
      await runWithIncreasedWorkflowNestingDepth(async () => {
        expect(getWorkflowNestingDepth()).toBe(1);
      });
      expect(getWorkflowNestingDepth()).toBe(0);
    });
  });

  describe("shouldSkipWorkflowRules", () => {
    it("is false at depth 0", () => {
      expect(shouldSkipWorkflowRules()).toBe(false);
    });

    it("is false while depth is below the cap", async () => {
      await runWithIncreasedWorkflowNestingDepth(async () => {
        // depth 1
        expect(shouldSkipWorkflowRules()).toBe(false);
        await runWithIncreasedWorkflowNestingDepth(async () => {
          // depth 2
          expect(shouldSkipWorkflowRules()).toBe(false);
        });
      });
    });

    it("flips to true once depth hits MAX_WORKFLOW_NESTING_DEPTH", async () => {
      // Build a chain of exactly MAX runs and assert the flag on the last
      async function nest(remaining: number): Promise<boolean> {
        if (remaining === 0) return shouldSkipWorkflowRules();
        return runWithIncreasedWorkflowNestingDepth(async () =>
          nest(remaining - 1),
        );
      }
      const skipAtMax = await nest(MAX_WORKFLOW_NESTING_DEPTH);
      expect(skipAtMax).toBe(true);
    });

    it("remains true beyond the cap (not just at the exact boundary)", async () => {
      async function nest(remaining: number): Promise<boolean> {
        if (remaining === 0) return shouldSkipWorkflowRules();
        return runWithIncreasedWorkflowNestingDepth(async () =>
          nest(remaining - 1),
        );
      }
      const skipAboveMax = await nest(MAX_WORKFLOW_NESTING_DEPTH + 2);
      expect(skipAboveMax).toBe(true);
    });
  });

  describe("runWithIncreasedWorkflowNestingDepth", () => {
    it("returns the result of the inner function", async () => {
      const result = await runWithIncreasedWorkflowNestingDepth(
        async () => "payload",
      );
      expect(result).toBe("payload");
    });

    it("propagates errors from the inner function", async () => {
      await expect(
        runWithIncreasedWorkflowNestingDepth(async () => {
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
    });

    it("restores depth even when the inner function throws", async () => {
      await expect(
        runWithIncreasedWorkflowNestingDepth(async () => {
          expect(getWorkflowNestingDepth()).toBe(1);
          throw new Error("fail");
        }),
      ).rejects.toThrow("fail");
      expect(getWorkflowNestingDepth()).toBe(0);
    });

    it("isolates sibling scopes — parallel runs do not share depth", async () => {
      const [a, b] = await Promise.all([
        runWithIncreasedWorkflowNestingDepth(async () =>
          getWorkflowNestingDepth(),
        ),
        runWithIncreasedWorkflowNestingDepth(async () =>
          getWorkflowNestingDepth(),
        ),
      ]);
      expect(a).toBe(1);
      expect(b).toBe(1);
    });
  });

  describe("MAX_WORKFLOW_NESTING_DEPTH", () => {
    it("is a positive integer (sanity check on the guard constant)", () => {
      expect(Number.isInteger(MAX_WORKFLOW_NESTING_DEPTH)).toBe(true);
      expect(MAX_WORKFLOW_NESTING_DEPTH).toBeGreaterThan(0);
    });
  });
});
