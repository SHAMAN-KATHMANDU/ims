import { Award } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { tierFor, TIER_BADGE_VARIANT } from "../../utils/tier";

/**
 * Customer tier badge derived from a contact's lifetime purchase count.
 * Helm design: Platinum/Gold/Silver/Prospect with an award glyph.
 */
export function TierBadge({
  purchaseCount,
  withMemberSuffix = false,
  className,
}: {
  purchaseCount: number;
  /** Append " member" to the label (used on the contact detail profile card). */
  withMemberSuffix?: boolean;
  className?: string;
}) {
  const tier = tierFor(purchaseCount);
  return (
    <Badge variant={TIER_BADGE_VARIANT[tier]} className={cn(className)}>
      <Award className="h-3 w-3" /> {tier}
      {withMemberSuffix ? " member" : ""}
    </Badge>
  );
}
