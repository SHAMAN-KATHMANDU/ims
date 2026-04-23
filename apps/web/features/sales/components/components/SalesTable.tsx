"use client";

import { format } from "date-fns";
import { Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { type SortOrder } from "@/components/ui/table";
import {
  type Sale,
  getSaleTypeLabel,
  getSaleTypeColor,
  formatCurrency,
} from "../../hooks/use-sales";

interface SalesTableProps {
  sales: Sale[];
  isLoading?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc" | "none";
  onSort?: (sortBy: string, sortOrder: "asc" | "desc" | "none") => void;
  onView: (sale: Sale) => void;
  currentPage?: number;
  itemsPerPage?: number;
  // Selection props
  selectedSales?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

function isCreditUnpaid(sale: Sale): boolean {
  if (!sale.isCreditSale) return false;
  const amountPaid =
    sale.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  return amountPaid < Number(sale.total);
}

export function SalesTable({
  sales,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onView,
  currentPage = 1,
  itemsPerPage = 10,
  selectedSales = new Set(),
  onSelectionChange,
  hasActiveFilters,
  onClearFilters,
}: SalesTableProps) {
  const columns: DataTableColumn<Sale>[] = [
    {
      id: "sn",
      header: "S.N.",
      cellClassName: "text-muted-foreground",
      cell: (_row, index) => (currentPage - 1) * itemsPerPage + index + 1,
    },
    {
      id: "saleCode",
      header: "Sale Code",
      sortKey: "saleCode",
      cellClassName: "font-medium",
      cell: (sale) => (
        <>
          <span>{sale.saleCode}</span>
          {sale.revisionNo != null && sale.revisionNo > 1 && (
            <Badge
              variant="outline"
              className="ml-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-normal"
            >
              Edited
            </Badge>
          )}
        </>
      ),
    },
    {
      id: "type",
      header: "Type",
      sortKey: "type",
      cell: (sale) => (
        <Badge className={getSaleTypeColor(sale.type)} variant="outline">
          {getSaleTypeLabel(sale.type)}
        </Badge>
      ),
    },
    {
      id: "credit",
      header: "Credit",
      cell: (sale) => {
        const isCredit = sale.isCreditSale === true;
        if (!isCredit) return <span className="text-muted-foreground">No</span>;
        const amountPaid =
          sale.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
        const fullyPaid = amountPaid >= Number(sale.total);
        return fullyPaid ? (
          <Badge
            variant="outline"
            className="bg-muted/50 text-foreground dark:text-white"
          >
            Yes (Paid)
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
          >
            Yes
          </Badge>
        );
      },
    },
    {
      id: "location",
      header: "Location",
      cell: (sale) => sale.location.name,
    },
    {
      id: "customer",
      header: "Customer",
      cell: (sale) =>
        sale.member ? (
          <div>
            <div className="font-medium">{sale.member.phone}</div>
            {sale.member.name && (
              <div className="text-sm text-muted-foreground">
                {sale.member.name}
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">Walk-in Customer</span>
        ),
    },
    {
      id: "total",
      header: "Total",
      sortKey: "total",
      headClassName: "text-right",
      cellClassName: "text-right font-medium",
      cell: (sale) => formatCurrency(Number(sale.total)),
    },
    {
      id: "subtotal",
      header: "Subtotal",
      sortKey: "subtotal",
      headClassName: "text-right",
      cellClassName: "text-right text-muted-foreground",
      cell: (sale) => formatCurrency(Number(sale.subtotal)),
    },
    {
      id: "discount",
      header: "Discount",
      sortKey: "discount",
      headClassName: "text-right",
      cellClassName: "text-right text-muted-foreground",
      cell: (sale) => formatCurrency(Number(sale.discount)),
    },
    {
      id: "paymentMethod",
      header: "Payment Method",
      cell: (sale) => (
        <Badge variant="outline">
          {sale.payments && sale.payments.length > 0
            ? (sale.payments[0]?.method ?? "N/A")
            : "N/A"}
        </Badge>
      ),
    },
    {
      id: "createdAt",
      header: "Date",
      sortKey: "createdAt",
      cell: (sale) => format(new Date(sale.createdAt), "MMM d, yyyy h:mm a"),
    },
  ];

  return (
    <DataTable<Sale>
      data={sales}
      columns={columns}
      getRowKey={(sale) => sale.id}
      isLoading={isLoading}
      skeletonRows={5}
      sort={
        onSort
          ? {
              sortBy: sortBy ?? "",
              sortOrder: (sortOrder ?? "none") as SortOrder,
              onSort,
            }
          : undefined
      }
      selection={
        onSelectionChange
          ? {
              selectedIds: selectedSales,
              onChange: onSelectionChange,
              getRowId: (sale) => sale.id,
            }
          : undefined
      }
      rowClassName={(sale) =>
        isCreditUnpaid(sale) ? "bg-amber-50/50 dark:bg-amber-950/20" : undefined
      }
      emptyState={{
        title: hasActiveFilters
          ? "No sales match your filters"
          : "No sales yet",
        description: hasActiveFilters
          ? "Try adjusting your search, date range, or filters."
          : "New sales will appear here once recorded.",
        action:
          hasActiveFilters && onClearFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={onClearFilters}
            >
              Clear filters
            </Button>
          ) : undefined,
      }}
      actions={(sale) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onView(sale)}
          aria-label={`View sale ${sale.saleCode}`}
        >
          <Eye className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
      className="rounded-md border overflow-x-auto"
      tableClassName="min-w-[640px]"
    />
  );
}
