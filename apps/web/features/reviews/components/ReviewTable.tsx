"use client";

import { format } from "date-fns";
import { Check, Star, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import type { Review, ReviewStatus } from "../hooks/use-reviews";

interface ReviewTableProps {
  reviews: Review[];
  isLoading?: boolean;
  selectedIds: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
  onApprove: (review: Review) => void;
  onReject: (review: Review) => void;
  onDelete: (review: Review) => void;
  pendingId?: string | null;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

/**
 * Admin moderation table. Row-level approve/reject flip the status in a
 * single PATCH; delete hands off to a confirmation dialog in the parent.
 * Checkboxes drive the parent's bulk-approve/reject controls.
 */
export function ReviewTable({
  reviews,
  isLoading,
  selectedIds,
  onSelectionChange,
  onApprove,
  onReject,
  onDelete,
  pendingId,
  hasActiveFilters,
  onClearFilters,
}: ReviewTableProps) {
  const columns: DataTableColumn<Review>[] = [
    {
      id: "product",
      header: "Product",
      cellClassName: "max-w-[200px] truncate font-medium",
      cell: (r) => r.product?.name ?? "—",
    },
    {
      id: "rating",
      header: "Rating",
      cell: (r) => <RatingStars value={r.rating} />,
    },
    {
      id: "review",
      header: "Review",
      cellClassName: "max-w-[320px]",
      cell: (r) => {
        if (!r.title && !r.body) {
          return (
            <span className="text-xs text-muted-foreground">(no content)</span>
          );
        }
        return (
          <>
            {r.title && (
              <div className="truncate text-sm font-medium">{r.title}</div>
            )}
            {r.body && (
              <div className="line-clamp-2 text-xs text-muted-foreground">
                {r.body}
              </div>
            )}
          </>
        );
      },
    },
    {
      id: "author",
      header: "Author",
      cellClassName: "text-sm",
      cell: (r) => r.authorName ?? "Anonymous",
    },
    {
      id: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      id: "createdAt",
      header: "Created",
      cellClassName: "text-xs text-muted-foreground",
      cell: (r) => format(new Date(r.createdAt), "MMM d, yyyy"),
    },
  ];

  return (
    <DataTable<Review>
      data={reviews}
      columns={columns}
      getRowKey={(r) => r.id}
      isLoading={isLoading}
      skeletonRows={6}
      selection={{
        selectedIds,
        onChange: onSelectionChange,
        getRowId: (r) => r.id,
      }}
      rowClassName={(r) => (pendingId === r.id ? "opacity-60" : undefined)}
      emptyState={{
        title: "No reviews to moderate",
        description: hasActiveFilters
          ? "Try clearing the filters to see more reviews."
          : "New reviews from your storefront will land here for moderation.",
        action:
          hasActiveFilters && onClearFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearFilters}
            >
              Clear filters
            </Button>
          ) : undefined,
      }}
      actions={(r) => {
        const busy = pendingId === r.id;
        return (
          <div className="inline-flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy || r.status === "APPROVED"}
              onClick={() => onApprove(r)}
              aria-label="Approve review"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy || r.status === "REJECTED"}
              onClick={() => onReject(r)}
              aria-label="Reject review"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onDelete(r)}
              aria-label="Delete review"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        );
      }}
    />
  );
}

function RatingStars({ value }: { value: number }) {
  const rounded = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div
      className="inline-flex items-center gap-0.5"
      aria-label={`${rounded} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < rounded
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/40",
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

const STATUS_VARIANT: Record<
  ReviewStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
};

function StatusBadge({ status }: { status: ReviewStatus }) {
  const v = STATUS_VARIANT[status];
  return (
    <Badge variant="secondary" className={v.className}>
      {v.label}
    </Badge>
  );
}
