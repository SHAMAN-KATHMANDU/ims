"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Can } from "@/features/permissions";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SortOrder } from "@/components/ui/table";
import { useToast } from "@/hooks/useToast";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  useGiftCardsPaginated,
  useVoidGiftCard,
} from "../hooks/use-gift-cards";
import type { GiftCard, GiftCardStatus } from "../types";
import { GiftCardTable } from "./GiftCardTable";

const STATUS_ALL = "__all__";
const STATUS_VALUES: GiftCardStatus[] = [
  "ACTIVE",
  "REDEEMED",
  "EXPIRED",
  "VOIDED",
];

export function GiftCardsPage() {
  const params = useParams<{ workspace: string }>();
  const workspace = params?.workspace ?? "";
  const { toast } = useToast();

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_ALL);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [voidTarget, setVoidTarget] = useState<GiftCard | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const statusParam =
    statusFilter === STATUS_ALL ? undefined : (statusFilter as GiftCardStatus);

  const { data, isLoading, isError, refetch } = useGiftCardsPaginated({
    page,
    limit,
    search: search.trim() || undefined,
    status: statusParam,
  });

  const voidMutation = useVoidGiftCard();

  const rows = useMemo(() => data?.data ?? [], [data?.data]);
  const total = data?.pagination?.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const hasActiveFilters =
    statusFilter !== STATUS_ALL || search.trim().length > 0;

  const clearFilters = () => {
    setStatusFilter(STATUS_ALL);
    setSearch("");
    setPage(DEFAULT_PAGE);
  };

  const handleSort = (key: string, order: SortOrder) => {
    setSortBy(key);
    setSortOrder(order);
    setPage(DEFAULT_PAGE);
  };

  const confirmVoid = async () => {
    if (!voidTarget) return;
    setPendingId(voidTarget.id);
    try {
      await voidMutation.mutateAsync(voidTarget.id);
      toast({ title: "Gift card voided" });
      setVoidTarget(null);
    } catch (err) {
      toast({
        title: "Failed to void gift card",
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
          <h1 className="text-2xl font-semibold">Gift cards</h1>
          <p className="text-sm text-muted-foreground">
            Issue and manage prepaid gift cards. Voided cards stop accepting
            redemptions immediately.
          </p>
        </div>
        <Can perm="INVENTORY.GIFT_CARDS.ISSUE">
          <Button asChild className="gap-2">
            <Link href={`/${workspace}/gift-cards/new`}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Issue gift card
            </Link>
          </Button>
        </Can>
      </div>

      {isError && (
        <div className="flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <span className="text-destructive">
            Couldn&apos;t load gift cards.
          </span>
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(DEFAULT_PAGE);
            }}
            placeholder="Search by code or recipient"
            className="pl-8"
            aria-label="Search gift cards"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(DEFAULT_PAGE);
          }}
        >
          <SelectTrigger className="w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_ALL}>All statuses</SelectItem>
            {STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </SelectItem>
            ))}
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

      <GiftCardTable
        giftCards={rows}
        isLoading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onVoid={setVoidTarget}
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
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setLimit(next);
            setPage(DEFAULT_PAGE);
          }}
          isLoading={isLoading}
          itemLabel="gift cards"
        />
      )}

      <AlertDialog
        open={voidTarget !== null}
        onOpenChange={(o) => !o && setVoidTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void gift card?</AlertDialogTitle>
            <AlertDialogDescription>
              Card{" "}
              <span className="font-mono">
                {voidTarget?.code ?? "this gift card"}
              </span>{" "}
              will stop accepting redemptions immediately. Any remaining balance
              will be lost. This cannot be undone from the UI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={voidMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmVoid();
              }}
              disabled={voidMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {voidMutation.isPending ? "Voiding…" : "Void gift card"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
