"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import { useCan } from "@/features/permissions";
import { Pencil, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
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
  const { allowed: canUpdateBundle } = useCan("INVENTORY.BUNDLES.UPDATE");
  const { allowed: canDeleteBundle } = useCan("INVENTORY.BUNDLES.DELETE");

  const renderMobileCard = useCallback(
    (b: Bundle) => {
      const busy = pendingId === b.id;
      return (
        <div className="rounded-md border bg-card p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm min-w-0 break-words">
              {b.name}
            </p>
            <StatusBadge
              variant={b.active ? "success" : "muted"}
              className="shrink-0"
            >
              {b.active ? "Active" : "Inactive"}
            </StatusBadge>
          </div>
          <p className="font-mono text-xs text-muted-foreground min-w-0 break-words">
            {b.slug}
          </p>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>
              <p className="text-xs">
                Pricing: {PRICING_LABEL[b.pricingStrategy]}
              </p>
              {b.pricingStrategy === "DISCOUNT_PCT" &&
                b.discountPct !== null && (
                  <p className="text-xs">Discount: {b.discountPct}%</p>
                )}
              {b.pricingStrategy === "FIXED" && b.fixedPrice !== null && (
                <p className="text-xs">Price: {b.fixedPrice}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Products</p>
              <p className="font-medium">{b.productIds.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Updated</p>
              <p className="text-xs">
                {format(new Date(b.updatedAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <div className="flex gap-1 pt-1">
            {canUpdateBundle && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onEdit(b)}
                className="h-7 text-xs flex-1"
              >
                <Pencil className="h-3 w-3 mr-1" aria-hidden="true" />
                Edit
              </Button>
            )}
            {canDeleteBundle && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onDelete(b)}
                className="h-7 text-xs flex-1 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" aria-hidden="true" />
                Delete
              </Button>
            )}
          </div>
        </div>
      );
    },
    [pendingId, canUpdateBundle, canDeleteBundle, onEdit, onDelete],
  );

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
        <StatusBadge variant={b.active ? "success" : "muted"}>
          {b.active ? "Active" : "Inactive"}
        </StatusBadge>
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
      renderMobileCard={renderMobileCard}
      mobileBreakpoint="md"
      actions={(b) => {
        const busy = pendingId === b.id;
        return (
          <div className="inline-flex gap-1">
            {canUpdateBundle && (
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
            )}
            {canDeleteBundle && (
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
            )}
          </div>
        );
      }}
    />
  );
}
