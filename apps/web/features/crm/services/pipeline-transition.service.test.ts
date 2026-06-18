import { describe, it, expect } from "vitest";
import { getTransitionInfo } from "./pipeline-transition.service";

describe("pipeline-transition.service", () => {
  // Edge case 1: NEW_SALES pipeline with WON status
  it("returns correct transition for NEW_SALES won deals", () => {
    const result = getTransitionInfo("NEW_SALES", "WON");
    expect(result).not.toBeNull();
    expect(result?.targetPipeline).toBe("Remarketing");
    expect(result?.targetStage).toBe("Post-Purchase Follow-up");
    expect(result?.description).toContain("post-purchase nurture");
  });

  // Edge case 2: NEW_SALES pipeline with LOST status
  it("returns correct transition for NEW_SALES lost deals", () => {
    const result = getTransitionInfo("NEW_SALES", "LOST");
    expect(result).not.toBeNull();
    expect(result?.targetPipeline).toBe("Remarketing");
    expect(result?.targetStage).toBe("Dormant");
    expect(result?.description).toContain("re-engagement");
  });

  // Edge case 3: REPURCHASE pipeline with WON status
  it("returns correct transition for REPURCHASE won deals", () => {
    const result = getTransitionInfo("REPURCHASE", "WON");
    expect(result).not.toBeNull();
    expect(result?.targetPipeline).toBe("Remarketing");
    expect(result?.targetStage).toBe("Post-Purchase Follow-up");
    expect(result?.description).toContain("continued nurture");
  });

  // Edge case 4: REPURCHASE pipeline with LOST status
  it("returns correct transition for REPURCHASE lost deals", () => {
    const result = getTransitionInfo("REPURCHASE", "LOST");
    expect(result).not.toBeNull();
    expect(result?.targetPipeline).toBe("Remarketing");
    expect(result?.targetStage).toBe("Dormant");
    expect(result?.description).toContain("re-engagement");
  });

  // Edge case 5: Unknown pipeline type returns null
  it("returns null for unknown pipeline types", () => {
    const result = getTransitionInfo("UNKNOWN_PIPELINE" as any, "WON");
    expect(result).toBeNull();
  });

  // Edge case 6: Won and Lost status differentiation for same pipeline
  it("distinguishes between WON and LOST outcomes for same pipeline", () => {
    const wonResult = getTransitionInfo("NEW_SALES", "WON");
    const lostResult = getTransitionInfo("NEW_SALES", "LOST");

    expect(wonResult?.targetStage).not.toBe(lostResult?.targetStage);
    expect(wonResult?.targetStage).toBe("Post-Purchase Follow-up");
    expect(lostResult?.targetStage).toBe("Dormant");
  });

  // Edge case 7: REPURCHASE WON uses "return" language vs NEW_SALES
  it("uses different messaging for REPURCHASE vs NEW_SALES on won deals", () => {
    const newSalesWon = getTransitionInfo("NEW_SALES", "WON");
    const repurchaseWon = getTransitionInfo("REPURCHASE", "WON");

    expect(newSalesWon?.description).toContain("move to");
    expect(repurchaseWon?.description).toContain("return to");
    expect(newSalesWon?.targetStage).toBe(repurchaseWon?.targetStage);
  });

  // Edge case 8: All transitions target Remarketing pipeline
  it("always transitions to Remarketing pipeline regardless of status", () => {
    const pipelines = ["NEW_SALES", "REPURCHASE"] as const;
    const statuses = ["WON", "LOST"] as const;

    pipelines.forEach((pipeline) => {
      statuses.forEach((status) => {
        const result = getTransitionInfo(pipeline, status);
        expect(result?.targetPipeline).toBe("Remarketing");
      });
    });
  });
});
