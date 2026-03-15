import api from "@/lib/axios";
import type { PipelineType } from "./pipeline.service";

export type DiscountAuthority = "AUTO_APPROVED" | "HUMAN_REVIEW" | "BLOCKED";

export interface DiscountAuthorityResult {
  authority: DiscountAuthority;
  reason: string;
  maxAutoApprovePercent: number;
}

export async function checkDiscountAuthority(data: {
  pipelineType: PipelineType;
  purchaseCount: number;
  discountPercent: number;
}): Promise<DiscountAuthorityResult> {
  const res = await api.post("/deals/check-discount", data);
  return res.data;
}
