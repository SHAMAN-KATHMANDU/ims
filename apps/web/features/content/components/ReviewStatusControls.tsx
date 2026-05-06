"use client";

/**
 * ReviewStatusControls — small surface that renders the per-record
 * review badge and the workflow transition buttons. Used by both
 * BlogPostEditor and TenantPageEditor — the parent wires its own
 * mutation hooks (so this component stays generic).
 *
 * Visibility: gated on the CMS_REVIEW_WORKFLOW env flag at the call
 * site. When the flag is off, parents simply don't render this.
 */

import { Send, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ContentReviewStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "PUBLISHED";

interface MutationLike {
  mutateAsync: (id: string) => Promise<unknown>;
  isPending: boolean;
}

interface Props {
  recordId: string;
  status: ContentReviewStatus;
  isAdmin: boolean;
  onRequestReview: MutationLike;
  onApprove: MutationLike;
  onReject: MutationLike;
}

const BADGE_VARIANT: Record<ContentReviewStatus, "default" | "secondary"> = {
  DRAFT: "secondary",
  IN_REVIEW: "secondary",
  APPROVED: "default",
  PUBLISHED: "default",
};

const BADGE_LABEL: Record<ContentReviewStatus, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
};

export function ReviewStatusControls({
  recordId,
  status,
  isAdmin,
  onRequestReview,
  onApprove,
  onReject,
}: Props) {
  const busy =
    onRequestReview.isPending || onApprove.isPending || onReject.isPending;
  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={BADGE_VARIANT[status]}
        className="font-mono uppercase tracking-wider"
      >
        {BADGE_LABEL[status]}
      </Badge>
      {status === "DRAFT" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void onRequestReview.mutateAsync(recordId)}
          disabled={busy}
        >
          <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Request review
        </Button>
      )}
      {status === "IN_REVIEW" && isAdmin && (
        <>
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={() => void onApprove.mutateAsync(recordId)}
            disabled={busy}
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void onReject.mutateAsync(recordId)}
            disabled={busy}
          >
            <XCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Reject
          </Button>
        </>
      )}
      {status === "IN_REVIEW" && !isAdmin && (
        <span className="text-xs text-muted-foreground">
          Waiting on admin to approve.
        </span>
      )}
      {status === "APPROVED" && (
        <span className="text-xs text-muted-foreground">
          Approved — click Publish to ship.
        </span>
      )}
    </div>
  );
}
