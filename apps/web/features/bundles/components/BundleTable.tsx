"use client";

import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { type SortOrder } from "@/components/ui/table";
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
  const columns: DataTableColumn<Bundle>[] = [
    {
      id: "name",
      header: "Name",
      sortKey: "name",
      cellClassName: "max-w-[240px] truncate font-medium",
      cell: (b) => b.name,
    },
    {
      id: "slug",
      header: "Slug",
      cellClassName: "text-xs text-muted-foreground font-mono",
      cell: (b) => b.slug,
    },
    {
      id: "pricing",
      header: "Pricing",
      cellClassName: "text-sm",
      cell: (b) => (
        <>
          {PRICING_LABEL[b.pricingStrategy]}
          {b.pricingStrategy === "DISCOUNT_PCT" && b.discountPct !== null && (
            <span className="text-muted-foreground"> ({b.discountPct}%)</span>
          )}
          {b.pricingStrategy === "FIXED" && b.fixedPrice !== null && (
            <span className="text-muted-foreground"> ({b.fixedPrice})</span>
          )}
        </>
      ),
    },
    {
      id: "products",
      header: "Products",
      cellClassName: "text-sm",
      cell: (b) =>
        `${b.productIds.length} product${b.productIds.length === 1 ? "" : "s"}`,
    },
    {
      id: "status",
      header: "Status",
      cell: (b) => (
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
      ),
    },
    {
      id: "updatedAt",
      header: "Updated",
      sortKey: "updatedAt",
      cellClassName: "text-xs text-muted-foreground",
      cell: (b) => format(new Date(b.updatedAt), "MMM d, yyyy"),
    },
  ];

  return (
    <DataTable<Bundle>
      data={bundles}
      columns={columns}
      getRowKey={(b) => b.id}
      isLoading={isLoading}
      skeletonRows={6}
      sort={{ sortBy, sortOrder, onSort }}
      rowClassName={(b) => (pendingId === b.id ? "opacity-60" : undefined)}
      emptyState={{
        title: "No bundles yet",
        description: hasActiveFilters
          ? "Try clearing the filters to see more bundles."
          : "Create your first bundle to start grouping products together.",
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
      actions={(b) => {
        const busy = pendingId === b.id;
        return (
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
        );
      }}
    />
  );
}
