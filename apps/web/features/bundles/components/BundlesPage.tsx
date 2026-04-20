"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import type { SortOrder } from "@/components/ui/table";
import { useToast } from "@/hooks/useToast";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  useBundlesPaginated,
  useDeleteBundle,
  type Bundle,
} from "../hooks/use-bundles";
import { BundleTable } from "./BundleTable";

const ACTIVE_ALL = "__all__";
const ACTIVE_TRUE = "active";
const ACTIVE_FALSE = "inactive";

/**
 * Top-level admin bundles list. Server-side pagination + sort + active
 * filter; the search input narrows by name *within the current page* —
 * the API has no name filter yet, so it's a client-side convenience.
 */
export function BundlesPage() {
  const params = useParams<{ workspace: string }>();
  const workspace = params?.workspace ?? "";
  const router = useRouter();
  const { toast } = useToast();

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [activeFilter, setActiveFilter] = useState<string>(ACTIVE_ALL);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [deleteTarget, setDeleteTarget] = useState<Bundle | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const activeParam =
    activeFilter === ACTIVE_TRUE
      ? true
      : activeFilter === ACTIVE_FALSE
        ? false
        : undefined;

  const { data, isLoading, isError, refetch } = useBundlesPaginated({
    page,
    limit,
    active: activeParam,
    sortBy: sortOrder === "none" ? undefined : sortBy,
    sortOrder: sortOrder === "none" ? undefined : sortOrder,
  });

  const deleteMutation = useDeleteBundle();

  const rows = useMemo(() => data?.data ?? [], [data?.data]);
  const total = data?.pagination?.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const visibleRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((b) => b.name.toLowerCase().includes(q));
  }, [rows, search]);

  const hasActiveFilters =
    activeFilter !== ACTIVE_ALL || search.trim().length > 0;

  const clearFilters = () => {
    setActiveFilter(ACTIVE_ALL);
    setSearch("");
    setPage(DEFAULT_PAGE);
  };

  const changePage = (next: number) => setPage(next);
  const changeLimit = (next: number) => {
    setLimit(next);
    setPage(DEFAULT_PAGE);
  };

  const handleSort = (key: string, order: SortOrder) => {
    setSortBy(key);
    setSortOrder(order);
    setPage(DEFAULT_PAGE);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setPendingId(deleteTarget.id);
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: "Bundle deleted" });
      setDeleteTarget(null);
      if (rows.length === 1 && page > 1) setPage(page - 1);
    } catch (err) {
      toast({
        title: "Failed to delete bundle",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Bundles</h1>
          <p className="text-sm text-muted-foreground">
            Group products together with custom pricing for storefront promos.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href={`/${workspace}/products/bundles/new`}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New bundle
          </Link>
        </Button>
      </div>

      {isError && (
        <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <span className="text-destructive">Couldn&apos;t load bundles.</span>
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
            placeholder="Filter by name"
            className="pl-8"
            aria-label="Filter bundles by name"
          />
        </div>

        <Select
          value={activeFilter}
          onValueChange={(v) => {
            setActiveFilter(v);
            setPage(DEFAULT_PAGE);
          }}
        >
          <SelectTrigger className="w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ACTIVE_ALL}>All bundles</SelectItem>
            <SelectItem value={ACTIVE_TRUE}>Active</SelectItem>
            <SelectItem value={ACTIVE_FALSE}>Inactive</SelectItem>
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

      <BundleTable
        bundles={visibleRows}
        isLoading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onEdit={(b) =>
          router.push(`/${workspace}/products/bundles/${b.id}/edit`)
        }
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
          itemLabel="bundles"
        />
      )}

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete bundle?"
        description="This bundle will be removed and unavailable on the storefront. This cannot be undone from the UI."
        itemName={deleteTarget?.name ?? "this bundle"}
        showReasonField={false}
        onConfirm={confirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
