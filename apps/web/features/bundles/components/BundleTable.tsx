"use client";

import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
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
import type { Bundle, BundlePricingStrategy } from "../types";

interface BundleTableProps {
  bundles: Bundle[];
  isLoading?: boolean;
  sortBy: string;
  sortOrder: SortOrder;
  onSort: (sortBy: string, sortOrder: SortOrder) => void;
  onEdit: (bundle: Bundle) => void;
  onDelete: (bundle: Bundle) => void;
  pendingId?: string | null;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

const PRICING_LABEL: Record<BundlePricingStrategy, string> = {
  SUM: "Sum of items",
  DISCOUNT_PCT: "Discount %",
  FIXED: "Fixed price",
};

export function BundleTable({
  bundles,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  pendingId,
  hasActiveFilters,
  onClearFilters,
}: BundleTableProps) {
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Pricing</TableHead>
            <TableHead>Products</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 7 }).map((__, j) => (
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

  if (bundles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-12 text-center">
        <p className="text-sm font-medium">No bundles yet</p>
        <p className="text-xs text-muted-foreground">
          {hasActiveFilters
            ? "Try clearing the filters to see more bundles."
            : "Create your first bundle to start grouping products together."}
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
          <SortableTableHead
            sortKey="name"
            currentSortBy={sortBy}
            currentSortOrder={sortOrder}
            onSort={onSort}
          >
            Name
          </SortableTableHead>
          <TableHead>Slug</TableHead>
          <TableHead>Pricing</TableHead>
          <TableHead>Products</TableHead>
          <TableHead>Status</TableHead>
          <SortableTableHead
            sortKey="updatedAt"
            currentSortBy={sortBy}
            currentSortOrder={sortOrder}
            onSort={onSort}
          >
            Updated
          </SortableTableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bundles.map((b) => {
          const busy = pendingId === b.id;
          return (
            <TableRow key={b.id} data-state={busy ? "selected" : undefined}>
              <TableCell className="max-w-[240px] truncate font-medium">
                {b.name}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground font-mono">
                {b.slug}
              </TableCell>
              <TableCell className="text-sm">
                {PRICING_LABEL[b.pricingStrategy]}
                {b.pricingStrategy === "DISCOUNT_PCT" &&
                  b.discountPct !== null && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({b.discountPct}%)
                    </span>
                  )}
                {b.pricingStrategy === "FIXED" && b.fixedPrice !== null && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({b.fixedPrice})
                  </span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {b.productIds.length} product
                {b.productIds.length === 1 ? "" : "s"}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={
                    b.active
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {b.active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(b.updatedAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => onEdit(b)}
                    aria-label={`Edit bundle ${b.name}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => onDelete(b)}
                    aria-label={`Delete bundle ${b.name}`}
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
