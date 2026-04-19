"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/useToast";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  useDeleteReview,
  useReviewsPaginated,
  useUpdateReview,
  type Review,
  type ReviewStatus,
} from "../hooks/use-reviews";
import { ReviewTable } from "./ReviewTable";

const STATUS_ALL = "__all__";

/**
 * Top-level admin moderation view. Server-side filters by status; the
 * search input narrows by product name *within the current page* — we
 * don't have a server-side name filter yet, so fuzzy search is a
 * client-side convenience layer on whatever the current page returns.
 */
export function ReviewsPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [status, setStatus] = useState<ReviewStatus | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useReviewsPaginated({
    page,
    limit,
    status,
  });

  const updateMutation = useUpdateReview();
  const deleteMutation = useDeleteReview();

  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Client-side name filter — server has no name search yet.
  const visibleRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      (r.product?.name ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const hasActiveFilters = Boolean(status) || search.trim().length > 0;

  const clearFilters = () => {
    setStatus(undefined);
    setSearch("");
    setPage(DEFAULT_PAGE);
  };

  const changePage = (next: number) => {
    setPage(next);
    setSelectedIds(new Set());
  };

  const changeLimit = (next: number) => {
    setLimit(next);
    setPage(DEFAULT_PAGE);
    setSelectedIds(new Set());
  };

  const patchStatus = async (review: Review, next: ReviewStatus) => {
    setPendingId(review.id);
    try {
      await updateMutation.mutateAsync({
        id: review.id,
        data: { status: next },
      });
      toast({ title: `Review ${next.toLowerCase()}` });
    } catch (err) {
      toast({
        title: "Failed to update review",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setPendingId(null);
    }
  };

  const bulkPatch = async (next: ReviewStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const results = await Promise.allSettled(
      ids.map((id) =>
        updateMutation.mutateAsync({ id, data: { status: next } }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      toast({
        title: `Updated ${ids.length - failed} of ${ids.length}`,
        description: `${failed} failed. Refreshing list.`,
        variant: "destructive",
      });
    } else {
      toast({ title: `${ids.length} reviews ${next.toLowerCase()}` });
    }
    setSelectedIds(new Set());
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: "Review deleted" });
      setDeleteTarget(null);
      // If the page is now empty and we're past page 1, step back.
      if (rows.length === 1 && page > 1) setPage(page - 1);
    } catch (err) {
      toast({
        title: "Failed to delete review",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <p className="text-sm text-muted-foreground">
          Moderate customer reviews before they appear on product pages.
        </p>
      </div>

      {isError && (
        <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <span className="text-destructive">Couldn&apos;t load reviews.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by product name"
            className="pl-8"
            aria-label="Filter by product name"
          />
        </div>

        <Select
          value={status ?? STATUS_ALL}
          onValueChange={(v) => {
            setStatus(v === STATUS_ALL ? undefined : (v as ReviewStatus));
            setPage(DEFAULT_PAGE);
            setSelectedIds(new Set());
          }}
        >
          <SelectTrigger className="w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_ALL}>All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-4 py-2 text-sm">
          <span>{selectedIds.size} selected on this page</span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => bulkPatch("APPROVED")}
              disabled={updateMutation.isPending}
            >
              Approve selected
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => bulkPatch("REJECTED")}
              disabled={updateMutation.isPending}
            >
              Reject selected
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <ReviewTable
        reviews={visibleRows}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onApprove={(r) => patchStatus(r, "APPROVED")}
        onReject={(r) => patchStatus(r, "REJECTED")}
        onDelete={setDeleteTarget}
        pendingId={pendingId}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      {total > 0 && (
        <DataTablePagination
          pagination={{
            currentPage: page,
            totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          }}
          onPageChange={changePage}
          onPageSizeChange={changeLimit}
          isLoading={isLoading}
          itemLabel="reviews"
        />
      )}

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete review?"
        description="This review will be removed from moderation and hidden from the storefront. This cannot be undone from the UI."
        itemName={deleteTarget?.product?.name ?? "this review"}
        showReasonField={false}
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
