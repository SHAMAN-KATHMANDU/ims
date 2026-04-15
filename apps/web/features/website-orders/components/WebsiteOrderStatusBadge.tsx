"use client";

import { Badge } from "@/components/ui/badge";
import type { WebsiteOrderStatus } from "../services/website-orders.service";

const LABELS: Record<WebsiteOrderStatus, string> = {
  PENDING_VERIFICATION: "Unverified",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  CONVERTED_TO_SALE: "Sold",
};

const VARIANTS: Record<
  WebsiteOrderStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING_VERIFICATION: "secondary",
  VERIFIED: "default",
  REJECTED: "destructive",
  CONVERTED_TO_SALE: "outline",
};

export function WebsiteOrderStatusBadge({
  status,
}: {
  status: WebsiteOrderStatus;
}) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
