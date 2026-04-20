"use client";

import { format } from "date-fns";
import { Ban } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SortableTableHead,
  type SortOrder,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Balance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Issued</TableHead>
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

  if (giftCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-12 text-center">
        <p className="text-sm font-medium">No gift cards yet</p>
        <p className="text-xs text-muted-foreground">
          {hasActiveFilters
            ? "Try clearing the filters to see more gift cards."
            : "Issue your first gift card to start selling them."}
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
          <TableHead>Code</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Balance</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Recipient</TableHead>
          <TableHead>Expires</TableHead>
          <SortableTableHead
            sortKey="createdAt"
            currentSortBy={sortBy}
            currentSortOrder={sortOrder}
            onSort={onSort}
          >
            Issued
          </SortableTableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {giftCards.map((gc) => {
          const busy = pendingId === gc.id;
          const canVoid = gc.status === "ACTIVE";
          return (
            <TableRow key={gc.id} data-state={busy ? "selected" : undefined}>
              <TableCell className="font-mono text-xs">{gc.code}</TableCell>
              <TableCell className="text-sm">
                {formatCents(gc.amount)}
              </TableCell>
              <TableCell className="text-sm font-medium">
                {formatCents(gc.balance)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={STATUS_STYLES[gc.status]}>
                  {STATUS_LABEL[gc.status]}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                {gc.recipientEmail ?? "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {gc.expiresAt
                  ? format(new Date(gc.expiresAt), "MMM d, yyyy")
                  : "Never"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(gc.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-right">
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
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
