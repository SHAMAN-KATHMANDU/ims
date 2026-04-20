"use client";

import { useCallback } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SortableTableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type Sale,
  getSaleTypeLabel,
  getSaleTypeColor,
  formatCurrency,
} from "../../hooks/use-sales";
import { Eye } from "lucide-react";

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
  const canSort = Boolean(onSort);
  // Calculate starting serial number for current page
  const getSerialNumber = (index: number) => {
    return (currentPage - 1) * itemsPerPage + index + 1;
  };

  // Selection handlers
  const handleSelectSale = useCallback(
    (saleId: string, checked: boolean) => {
      if (!onSelectionChange) return;

      const newSelection = new Set(selectedSales);
      if (checked) {
        newSelection.add(saleId);
      } else {
        newSelection.delete(saleId);
      }
      onSelectionChange(newSelection);
    },
    [selectedSales, onSelectionChange],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!onSelectionChange) return;

      if (checked) {
        const allIds = new Set(sales.map((s) => s.id));
        onSelectionChange(allIds);
      } else {
        onSelectionChange(new Set());
      }
    },
    [sales, onSelectionChange],
  );

  // Check if all sales on current page are selected
  const allSelected =
    sales.length > 0 && sales.every((s) => selectedSales.has(s.id));

  // S.N., Sale Code, Type, Credit, Location, Customer, Total, Subtotal, Discount, Payment, Date, Actions
  const baseColumnCount = 12;
  const columnCount = onSelectionChange ? baseColumnCount + 1 : baseColumnCount;

  if (isLoading) {
    return (
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>S.N.</TableHead>
              {onSelectionChange && (
                <TableHead className="w-12">
                  <Checkbox disabled aria-label="Select all sales" />
                </TableHead>
              )}
              <TableHead>Sale Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Credit</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-8" />
                </TableCell>
                {onSelectionChange && (
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                )}
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-20 ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-8 w-8 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>S.N.</TableHead>
              {onSelectionChange && (
                <TableHead className="w-12">
                  <Checkbox disabled aria-label="Select all sales" />
                </TableHead>
              )}
              <TableHead>Sale Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Credit</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columnCount} className="text-center py-10">
                {hasActiveFilters ? (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm font-medium">
                      No sales match your filters
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search, date range, or filters.
                    </p>
                    {onClearFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={onClearFilters}
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-sm font-medium">No sales yet</p>
                    <p className="text-sm text-muted-foreground">
                      New sales will appear here once recorded.
                    </p>
                  </div>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead>S.N.</TableHead>
            {onSelectionChange && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all sales"
                />
              </TableHead>
            )}
            {canSort ? (
              <SortableTableHead
                sortKey="saleCode"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={onSort!}
              >
                Sale Code
              </SortableTableHead>
            ) : (
              <TableHead>Sale Code</TableHead>
            )}
            {canSort ? (
              <SortableTableHead
                sortKey="type"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={onSort!}
              >
                Type
              </SortableTableHead>
            ) : (
              <TableHead>Type</TableHead>
            )}
            <TableHead>Credit</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Customer</TableHead>
            {canSort ? (
              <SortableTableHead
                sortKey="total"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={onSort!}
                className="text-right"
              >
                Total
              </SortableTableHead>
            ) : (
              <TableHead className="text-right">Total</TableHead>
            )}
            {canSort ? (
              <SortableTableHead
                sortKey="subtotal"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={onSort!}
                className="text-right"
              >
                Subtotal
              </SortableTableHead>
            ) : (
              <TableHead className="text-right">Subtotal</TableHead>
            )}
            {canSort ? (
              <SortableTableHead
                sortKey="discount"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={onSort!}
                className="text-right"
              >
                Discount
              </SortableTableHead>
            ) : (
              <TableHead className="text-right">Discount</TableHead>
            )}
            <TableHead>Payment Method</TableHead>
            {canSort ? (
              <SortableTableHead
                sortKey="createdAt"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={onSort!}
              >
                Date
              </SortableTableHead>
            ) : (
              <TableHead>Date</TableHead>
            )}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale, index) => {
            const isCredit = sale.isCreditSale === true;
            const amountPaid =
              sale.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
            const fullyPaid = isCredit && amountPaid >= Number(sale.total);
            // Amber row only when credit sale is still unpaid; white when fully paid
            const isCreditUnpaid = isCredit && !fullyPaid;
            return (
              <TableRow
                key={sale.id}
                className={
                  isCreditUnpaid
                    ? "bg-amber-50/50 dark:bg-amber-950/20"
                    : undefined
                }
              >
                <TableCell className="text-muted-foreground">
                  {getSerialNumber(index)}
                </TableCell>
                {onSelectionChange && (
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    className="w-12"
                  >
                    <Checkbox
                      checked={selectedSales.has(sale.id)}
                      onCheckedChange={(checked) =>
                        handleSelectSale(sale.id, checked === true)
                      }
                      aria-label={`Select ${sale.saleCode}`}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  <span>{sale.saleCode}</span>
                  {sale.revisionNo != null && sale.revisionNo > 1 && (
                    <Badge
                      variant="outline"
                      className="ml-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-normal"
                    >
                      Edited
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    className={getSaleTypeColor(sale.type)}
                    variant="outline"
                  >
                    {getSaleTypeLabel(sale.type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isCredit ? (
                    fullyPaid ? (
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
                    )
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </TableCell>
                <TableCell>{sale.location.name}</TableCell>
                <TableCell>
                  {sale.member ? (
                    <div>
                      <div className="font-medium">{sale.member.phone}</div>
                      {sale.member.name && (
                        <div className="text-sm text-muted-foreground">
                          {sale.member.name}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      Walk-in Customer
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(Number(sale.total))}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(Number(sale.subtotal))}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(Number(sale.discount))}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {sale.payments && sale.payments.length > 0
                      ? (sale.payments[0]?.method ?? "N/A")
                      : "N/A"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(sale.createdAt), "MMM d, yyyy h:mm a")}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onView(sale)}
                    aria-label={`View sale ${sale.saleCode}`}
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
