"use client";

import { useState } from "react";
import {
  useSalesSinceLastLogin,
  useSale,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  type Sale,
} from "@/features/sales";
import { SalesTable, SaleDetail } from "@/features/sales";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";

export default function UserSalesReportPage() {
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const { data: response, isLoading } = useSalesSinceLastLogin({
    page,
    limit: pageSize,
  });
  const sales = response?.data ?? [];
  const pagination = response?.pagination;
  const { data: selectedSale } = useSale(selectedSaleId ?? "");

  const salesPagination: PaginationState | null = pagination
    ? {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        totalItems: pagination.totalItems,
        itemsPerPage: pagination.itemsPerPage,
        hasNextPage: pagination.hasNextPage,
        hasPrevPage: pagination.hasPrevPage,
      }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Sales Report</h1>
        <p className="text-muted-foreground mt-2">
          Your sales since last login
        </p>
      </div>

      <SalesTable
        sales={sales}
        isLoading={isLoading}
        onView={(sale: Sale) => setSelectedSaleId(sale.id)}
        currentPage={page}
        itemsPerPage={pageSize}
      />

      {salesPagination && (
        <DataTablePagination
          pagination={salesPagination}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(DEFAULT_PAGE);
          }}
        />
      )}

      {selectedSale && (
        <SaleDetail
          sale={selectedSale}
          open={!!selectedSaleId}
          onOpenChange={(open) => !open && setSelectedSaleId(null)}
        />
      )}
    </div>
  );
}
