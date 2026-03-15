/**
 * Discount Authority Service
 *
 * Determines whether a discount on a deal can be auto-approved,
 * needs human review, or is blocked based on pipeline type,
 * contact's purchaseCount, and discount percentage.
 */

import type { PipelineType } from "@prisma/client";

export type DiscountAuthority = "AUTO_APPROVED" | "HUMAN_REVIEW" | "BLOCKED";

export interface DiscountAuthorityResult {
  authority: DiscountAuthority;
  reason: string;
  maxAutoApprovePercent: number;
}

interface DiscountAuthorityInput {
  pipelineType: PipelineType;
  purchaseCount: number;
  discountPercent: number;
}

/**
 * Discount authority matrix:
 *
 * | Pipeline Type | Purchase Count | Max Auto-Approve | > Max → |
 * |---------------|---------------|------------------|---------|
 * | NEW_SALES     | 0 (new lead)  | 5%               | HUMAN_REVIEW |
 * | NEW_SALES     | 1+            | 10%              | HUMAN_REVIEW |
 * | REMARKETING   | any           | 15%              | HUMAN_REVIEW |
 * | REPURCHASE    | 1             | 10%              | HUMAN_REVIEW |
 * | REPURCHASE    | 2 (repeat)    | 15%              | HUMAN_REVIEW |
 * | REPURCHASE    | 3+ (VIP)      | 20%              | HUMAN_REVIEW |
 * | GENERAL       | any           | 10%              | HUMAN_REVIEW |
 * | any           | any           | > 30%            | BLOCKED  |
 */
export function checkDiscountAuthority(
  input: DiscountAuthorityInput,
): DiscountAuthorityResult {
  const { pipelineType, purchaseCount, discountPercent } = input;

  if (discountPercent <= 0) {
    return {
      authority: "AUTO_APPROVED",
      reason: "No discount applied",
      maxAutoApprovePercent: getMaxAutoApprove(pipelineType, purchaseCount),
    };
  }

  if (discountPercent > 30) {
    return {
      authority: "BLOCKED",
      reason: "Discount exceeds 30% — admin override required",
      maxAutoApprovePercent: getMaxAutoApprove(pipelineType, purchaseCount),
    };
  }

  const maxAuto = getMaxAutoApprove(pipelineType, purchaseCount);

  if (discountPercent <= maxAuto) {
    return {
      authority: "AUTO_APPROVED",
      reason: `Within auto-approve limit (${maxAuto}%)`,
      maxAutoApprovePercent: maxAuto,
    };
  }

  return {
    authority: "HUMAN_REVIEW",
    reason: `Discount ${discountPercent}% exceeds auto-approve limit of ${maxAuto}%`,
    maxAutoApprovePercent: maxAuto,
  };
}

function getMaxAutoApprove(
  pipelineType: PipelineType,
  purchaseCount: number,
): number {
  switch (pipelineType) {
    case "NEW_SALES":
      return purchaseCount >= 1 ? 10 : 5;
    case "REMARKETING":
      return 15;
    case "REPURCHASE":
      if (purchaseCount >= 3) return 20;
      if (purchaseCount >= 2) return 15;
      return 10;
    case "GENERAL":
    default:
      return 10;
  }
}
