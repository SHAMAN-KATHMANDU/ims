"use client";

import { format } from "date-fns";
import { Ban } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

const STATUS_STYLES: Record<GiftCardStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  REDEEMED: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  EXPIRED: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  VOIDED: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<GiftCardStatus, string> = {
  ACTIVE: "Active",
  REDEEMED: "Redeemed",
  EXPIRED: "Expired",
  VOIDED: "Voided",
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
        <Badge variant="secondary" className={STATUS_STYLES[gc.status]}>
          {STATUS_LABEL[gc.status]}
        </Badge>
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
        const canVoid = gc.status === "ACTIVE";
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
