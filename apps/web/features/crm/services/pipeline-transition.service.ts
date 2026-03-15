import type { PipelineType } from "./pipeline.service";

/**
 * Client-side helper to determine what transition will happen
 * when a deal in a typed pipeline is won or lost.
 */

interface TransitionInfo {
  targetPipeline: string;
  targetStage: string;
  description: string;
}

export function getTransitionInfo(
  pipelineType: PipelineType,
  dealStatus: "WON" | "LOST",
): TransitionInfo | null {
  if (pipelineType === "NEW_SALES" && dealStatus === "WON") {
    return {
      targetPipeline: "Remarketing",
      targetStage: "Post-Purchase Follow-up",
      description:
        "Contact will move to Remarketing pipeline for post-purchase nurture",
    };
  }
  if (pipelineType === "NEW_SALES" && dealStatus === "LOST") {
    return {
      targetPipeline: "Remarketing",
      targetStage: "Dormant",
      description:
        "Contact will move to Remarketing pipeline for re-engagement",
    };
  }
  if (pipelineType === "REPURCHASE" && dealStatus === "WON") {
    return {
      targetPipeline: "Remarketing",
      targetStage: "Post-Purchase Follow-up",
      description:
        "Contact will return to Remarketing pipeline for continued nurture",
    };
  }
  if (pipelineType === "REPURCHASE" && dealStatus === "LOST") {
    return {
      targetPipeline: "Remarketing",
      targetStage: "Dormant",
      description:
        "Contact will return to Remarketing pipeline for re-engagement",
    };
  }
  return null;
}
