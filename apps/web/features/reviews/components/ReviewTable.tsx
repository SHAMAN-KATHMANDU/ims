"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { Check, Star, Trash2, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
  const handleSelectOne = useCallback(
    (id: string, checked: boolean) => {
      const next = new Set(selectedIds);
      if (checked) next.add(id);
      else next.delete(id);
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) onSelectionChange(new Set(reviews.map((r) => r.id)));
      else onSelectionChange(new Set());
    },
    [reviews, onSelectionChange],
  );

  const allSelected =
    reviews.length > 0 && reviews.every((r) => selectedIds.has(r.id));
  const someSelected =
    reviews.some((r) => selectedIds.has(r.id)) && !allSelected;

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Product</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Review</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 8 }).map((__, j) => (
                <TableCell key={j}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-12 text-center">
        <p className="text-sm font-medium">No reviews to moderate</p>
        <p className="text-xs text-muted-foreground">
          {hasActiveFilters
            ? "Try clearing the filters to see more reviews."
            : "New reviews from your storefront will land here for moderation."}
        </p>
        {hasActiveFilters && onClearFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="mt-2"
          >
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={allSelected}
              data-state={
                someSelected
                  ? "indeterminate"
                  : allSelected
                    ? "checked"
                    : "unchecked"
              }
              onCheckedChange={(v) => handleSelectAll(Boolean(v))}
              aria-label="Select all reviews on this page"
            />
          </TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Review</TableHead>
          <TableHead>Author</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reviews.map((r) => {
          const busy = pendingId === r.id;
          return (
            <TableRow key={r.id} data-state={busy ? "selected" : undefined}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(r.id)}
                  onCheckedChange={(v) => handleSelectOne(r.id, Boolean(v))}
                  aria-label={`Select review by ${r.authorName ?? "anonymous"}`}
                />
              </TableCell>
              <TableCell className="max-w-[200px] truncate font-medium">
                {r.product?.name ?? "—"}
              </TableCell>
              <TableCell>
                <RatingStars value={r.rating} />
              </TableCell>
              <TableCell className="max-w-[320px]">
                {r.title && (
                  <div className="truncate text-sm font-medium">{r.title}</div>
                )}
                {r.body && (
                  <div className="line-clamp-2 text-xs text-muted-foreground">
                    {r.body}
                  </div>
                )}
                {!r.title && !r.body && (
                  <span className="text-xs text-muted-foreground">
                    (no content)
                  </span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {r.authorName ?? "Anonymous"}
              </TableCell>
              <TableCell>
                <StatusBadge status={r.status} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(r.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-right">
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
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
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
