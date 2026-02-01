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
} from "@/hooks/useSales";
import { Eye } from "lucide-react";

interface SalesTableProps {
  sales: Sale[];
  isLoading?: boolean;
  onView: (sale: Sale) => void;
  currentPage?: number;
  itemsPerPage?: number;
  // Selection props
  selectedSales?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export function SalesTable({
  sales,
  isLoading,
  onView,
  currentPage = 1,
  itemsPerPage = 10,
  selectedSales = new Set(),
  onSelectionChange,
}: SalesTableProps) {
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

  // Calculate column count for empty state (S.N. + optional checkbox + rest)
  const baseColumnCount = 9; // S.N., Sale Code, Type, Location, Customer, Total, Payment Method, Date, Actions
  const columnCount = onSelectionChange ? baseColumnCount + 1 : baseColumnCount;

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
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
              <TableHead>Location</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total</TableHead>
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
      <div className="rounded-md border">
        <Table>
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
              <TableHead>Location</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columnCount} className="text-center py-8">
                <p className="text-muted-foreground">No sales found</p>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
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
            <TableHead>Sale Code</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale, index) => (
            <TableRow key={sale.id}>
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
              <TableCell className="font-medium">{sale.saleCode}</TableCell>
              <TableCell>
                <Badge
                  className={getSaleTypeColor(sale.type)}
                  variant="outline"
                >
                  {getSaleTypeLabel(sale.type)}
                </Badge>
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
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
