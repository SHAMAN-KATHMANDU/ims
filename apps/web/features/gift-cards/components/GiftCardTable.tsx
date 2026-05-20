"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { Ban } from "lucide-react";
import { useCan } from "@/features/permissions";

import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TableRow, type SortOrder } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { GiftCard, GiftCardStatus } from "../types";

interface GiftCardTableProps {
  giftCards: GiftCard[];
  isLoading?: boolean;
  sortBy: string;
  sortOrder: SortOrder;
  onSort: (sortBy: string, sortOrder: SortOrder) => void;
  onVoid: (giftCard: GiftCard) => void;
  pendingId?: string | null;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

const STATUS_LABEL: Record<GiftCardStatus, string> = {
  ACTIVE: "Active",
  REDEEMED: "Redeemed",
  EXPIRED: "Expired",
  VOIDED: "Voided",
};

const STATUS_VARIANT: Record<
  GiftCardStatus,
  "success" | "info" | "warning" | "muted"
> = {
  ACTIVE: "success",
  REDEEMED: "info",
  EXPIRED: "warning",
  VOIDED: "muted",
};

function formatCents(cents: number): string {
  return formatCurrency(cents / 100);
}

export function GiftCardTable({
  giftCards,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onVoid,
  pendingId,
  hasActiveFilters,
  onClearFilters,
}: GiftCardTableProps) {
  const { allowed: canVoidGiftCard } = useCan("INVENTORY.GIFT_CARDS.VOID");

  const renderMobileCard = useCallback(
    (gc: GiftCard) => {
      const busy = pendingId === gc.id;
      const canVoid = gc.status === "ACTIVE" && canVoidGiftCard;
      return (
        <div className="rounded-md border bg-card p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-sm font-semibold min-w-0 break-words">
              {gc.code}
            </p>
            <StatusBadge
              variant={STATUS_VARIANT[gc.status]}
              className="shrink-0"
            >
              {STATUS_LABEL[gc.status]}
            </StatusBadge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-medium">{formatCents(gc.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="font-medium">{formatCents(gc.balance)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expires</p>
              <p className="text-xs">
                {gc.expiresAt
                  ? format(new Date(gc.expiresAt), "MMM d, yyyy")
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Issued</p>
              <p className="text-xs">
                {format(new Date(gc.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          {gc.recipientEmail && (
            <div className="text-sm">
              <p className="text-xs text-muted-foreground">Recipient</p>
              <p className="text-xs min-w-0 break-words">{gc.recipientEmail}</p>
            </div>
          )}
          {canVoid && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => onVoid(gc)}
              className="w-full h-7 text-xs"
            >
              <Ban className="mr-1 h-4 w-4" aria-hidden="true" />
              Void Card
            </Button>
          )}
        </div>
      );
    },
    [pendingId, canVoidGiftCard, onVoid],
  );

  const columns: DataTableColumn<GiftCard>[] = [
    {
      id: "code",
      header: "Code",
      cellClassName: "font-mono text-xs",
      cell: (gc) => gc.code,
    },
    {
      id: "amount",
      header: "Amount",
      cellClassName: "text-sm",
      cell: (gc) => formatCents(gc.amount),
    },
    {
      id: "balance",
      header: "Balance",
      cellClassName: "text-sm font-medium",
      cell: (gc) => formatCents(gc.balance),
    },
    {
      id: "status",
      header: "Status",
      cell: (gc) => (
        <StatusBadge variant={STATUS_VARIANT[gc.status]}>
          {STATUS_LABEL[gc.status]}
        </StatusBadge>
      ),
    },
    {
      id: "recipient",
      header: "Recipient",
      cellClassName: "max-w-[200px] truncate text-sm text-muted-foreground",
      cell: (gc) => gc.recipientEmail ?? "—",
    },
    {
      id: "expires",
      header: "Expires",
      cellClassName: "text-xs text-muted-foreground",
      cell: (gc) =>
        gc.expiresAt ? format(new Date(gc.expiresAt), "MMM d, yyyy") : "Never",
    },
    {
      id: "createdAt",
      header: "Issued",
      sortKey: "createdAt",
      cellClassName: "text-xs text-muted-foreground",
      cell: (gc) => format(new Date(gc.createdAt), "MMM d, yyyy"),
    },
  ];

  return (
    <DataTable<GiftCard>
      data={giftCards}
      columns={columns}
      getRowKey={(gc) => gc.id}
      isLoading={isLoading}
      skeletonRows={6}
      sort={{ sortBy, sortOrder, onSort }}
      emptyState={{
        title: "No gift cards yet",
        description: hasActiveFilters
          ? "Try clearing the filters to see more gift cards."
          : "Issue your first gift card to start selling them.",
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
      renderMobileCard={renderMobileCard}
      mobileBreakpoint="md"
      renderRow={(gc, defaultCells, { rowKey }) => {
        const busy = pendingId === gc.id;
        return (
          <TableRow key={rowKey} data-state={busy ? "selected" : undefined}>
            {defaultCells}
          </TableRow>
        );
      }}
      actions={(gc) => {
        const busy = pendingId === gc.id;
        const canVoid = gc.status === "ACTIVE" && canVoidGiftCard;
        return (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy || !canVoid}
            onClick={() => onVoid(gc)}
            aria-label={`Void gift card ${gc.code}`}
            className="text-destructive hover:text-destructive"
          >
            <Ban className="mr-1 h-4 w-4" aria-hidden="true" />
            Void
          </Button>
        );
      }}
    />
  );
}
