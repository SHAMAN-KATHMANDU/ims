// Customer tier derived from lifetime purchase count — mirrors the Helm CRM
// design's `tierFor`. Used for contact tier badges (Phase 4) and contact detail.
import type { BadgeVariant } from "../components/shared/badge-variant";

export type Tier = "Platinum" | "Gold" | "Silver" | "Prospect";

/** Tier from lifetime purchase count: 5+ Platinum, 3-4 Gold, 1-2 Silver, 0 Prospect. */
export function tierFor(purchaseCount: number): Tier {
  if (purchaseCount >= 5) return "Platinum";
  if (purchaseCount >= 3) return "Gold";
  if (purchaseCount >= 1) return "Silver";
  return "Prospect";
}

/** Badge variant per tier (uses the existing Badge variants). */
export const TIER_BADGE_VARIANT: Record<Tier, BadgeVariant> = {
  Platinum: "default",
  Gold: "warning",
  Silver: "info",
  Prospect: "secondary",
};
