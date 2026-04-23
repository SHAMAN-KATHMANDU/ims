"use client";

import { Fragment, useCallback, useMemo, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  SortableTableHead,
  type SortOrder,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { cn } from "@/lib/utils";

// ============================================
// Column + config types
// ============================================

export interface DataTableColumn<T> {
  /** Stable unique key. */
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  /** When set, the header becomes a `SortableTableHead` keyed by this string. */
  sortKey?: string;
  /** Optional `th` className. */
  headClassName?: string;
  /** Optional `td` className — string or row-aware function. */
  cellClassName?: string | ((row: T) => string | undefined);
  /** When true this column is hidden at the `mobileBreakpoint` and below. */
  hideOnMobile?: boolean;
}

export interface DataTableSort {
  sortBy: string;
  sortOrder: SortOrder;
  onSort: (sortBy: string, sortOrder: SortOrder) => void;
}

export interface DataTableSelection<T> {
  selectedIds: Set<string>;
  onChange: (next: Set<string>) => void;
  getRowId: (row: T) => string;
  /** Optional: rows for which selection checkbox is disabled. */
  isRowDisabled?: (row: T) => boolean;
}

export interface DataTableEmptyState {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  /** Stable key per row. */
  getRowKey: (row: T, index: number) => string;

  // lifecycle
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;

  // optional behaviors
  sort?: DataTableSort;
  selection?: DataTableSelection<T>;
  emptyState?: DataTableEmptyState;
  skeletonRows?: number;

  // right-most action column (edit/delete icons, etc.)
  actions?: (row: T) => ReactNode;
  actionsHeader?: ReactNode;

  // responsive: when provided, rendered at `<mobileBreakpoint` instead of the table
  renderMobileCard?: (row: T, index: number) => ReactNode;
  mobileBreakpoint?: "sm" | "md" | "lg";

  // escape hatches
  /** Override an entire row render. The supplied `defaultCells` are the computed `<TableCell>`s. */
  renderRow?: (
    row: T,
    defaultCells: ReactNode,
    meta: { index: number; rowKey: string; isSelected: boolean },
  ) => ReactNode;
  rowClassName?: string | ((row: T) => string | undefined);
  onRowClick?: (row: T) => void;

  // misc
  className?: string;
  tableClassName?: string;
  "aria-label"?: string;
}

// ============================================
// Internal helpers
// ============================================

const BREAKPOINT_HIDE: Record<
  NonNullable<DataTableProps<unknown>["mobileBreakpoint"]>,
  { tableClass: string; cardClass: string; colClass: string }
> = {
  sm: {
    tableClass: "hidden sm:block",
    cardClass: "sm:hidden",
    colClass: "hidden sm:table-cell",
  },
  md: {
    tableClass: "hidden md:block",
    cardClass: "md:hidden",
    colClass: "hidden md:table-cell",
  },
  lg: {
    tableClass: "hidden lg:block",
    cardClass: "lg:hidden",
    colClass: "hidden lg:table-cell",
  },
};

// ============================================
// Main component
// ============================================

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  isLoading,
  error,
  onRetry,
  sort,
  selection,
  emptyState,
  skeletonRows = 5,
  actions,
  actionsHeader = <span className="sr-only">Actions</span>,
  renderMobileCard,
  mobileBreakpoint = "md",
  renderRow,
  rowClassName,
  onRowClick,
  className,
  tableClassName,
  "aria-label": ariaLabel,
}: DataTableProps<T>) {
  const bp = renderMobileCard ? BREAKPOINT_HIDE[mobileBreakpoint] : null;

  // Total columns in the rendered <table> (selection + data + actions)
  const totalColumns = useMemo(
    () => columns.length + (selection ? 1 : 0) + (actions ? 1 : 0),
    [columns.length, selection, actions],
  );

  // ----- selection helpers -----
  const selectableRowIds = useMemo(() => {
    if (!selection) return [] as string[];
    return data
      .filter((row) => !selection.isRowDisabled?.(row))
      .map((row) => selection.getRowId(row));
  }, [data, selection]);

  const allSelected =
    selection != null &&
    selectableRowIds.length > 0 &&
    selectableRowIds.every((id) => selection.selectedIds.has(id));
  const someSelected =
    selection != null &&
    selectableRowIds.some((id) => selection.selectedIds.has(id)) &&
    !allSelected;

  const handleToggleAll = useCallback(() => {
    if (!selection) return;
    if (allSelected) {
      const next = new Set(selection.selectedIds);
      selectableRowIds.forEach((id) => next.delete(id));
      selection.onChange(next);
    } else {
      const next = new Set(selection.selectedIds);
      selectableRowIds.forEach((id) => next.add(id));
      selection.onChange(next);
    }
  }, [selection, selectableRowIds, allSelected]);

  const handleToggleRow = useCallback(
    (rowId: string, checked: boolean) => {
      if (!selection) return;
      const next = new Set(selection.selectedIds);
      if (checked) next.add(rowId);
      else next.delete(rowId);
      selection.onChange(next);
    },
    [selection],
  );

  // ----- error short-circuit -----
  if (error) {
    return (
      <div className={cn("space-y-3", className)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Failed to load</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error.message || "Please try again."}</span>
            {onRetry && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRetry}
              >
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ----- empty -----
  const isEmpty = !isLoading && data.length === 0;

  // ----- table header -----
  const headerRow = (
    <TableRow>
      {selection && (
        <TableHead className="w-10">
          <Checkbox
            aria-label={allSelected ? "Deselect all rows" : "Select all rows"}
            checked={
              allSelected ? true : someSelected ? "indeterminate" : false
            }
            onCheckedChange={handleToggleAll}
            disabled={selectableRowIds.length === 0}
          />
        </TableHead>
      )}
      {columns.map((col) => {
        const headClass = cn(
          col.headClassName,
          col.hideOnMobile && bp?.colClass,
        );
        if (col.sortKey && sort) {
          return (
            <SortableTableHead
              key={col.id}
              sortKey={col.sortKey}
              currentSortBy={sort.sortBy}
              currentSortOrder={sort.sortOrder}
              onSort={sort.onSort}
              className={headClass}
            >
              {col.header}
            </SortableTableHead>
          );
        }
        return (
          <TableHead key={col.id} className={headClass}>
            {col.header}
          </TableHead>
        );
      })}
      {actions && (
        <TableHead className="w-1 whitespace-nowrap text-right">
          {actionsHeader}
        </TableHead>
      )}
    </TableRow>
  );

  // ----- table body -----
  const body = (() => {
    if (isLoading) {
      return <TableSkeleton rows={skeletonRows} columns={totalColumns} />;
    }
    if (isEmpty) {
      return (
        <TableRow>
          <TableCell colSpan={totalColumns} className="p-0">
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyTitle>{emptyState?.title ?? "No results"}</EmptyTitle>
                {emptyState?.description && (
                  <EmptyDescription>{emptyState.description}</EmptyDescription>
                )}
              </EmptyHeader>
              {emptyState?.action && (
                <EmptyContent>{emptyState.action}</EmptyContent>
              )}
            </Empty>
          </TableCell>
        </TableRow>
      );
    }
    return data.map((row, index) => {
      const rowKey = getRowKey(row, index);
      const rowId = selection ? selection.getRowId(row) : rowKey;
      const isSelected = selection ? selection.selectedIds.has(rowId) : false;
      const isDisabled = selection?.isRowDisabled?.(row) ?? false;
      const computedRowClass =
        typeof rowClassName === "function" ? rowClassName(row) : rowClassName;
      const cells = (
        <>
          {selection && (
            <TableCell className="w-10">
              <Checkbox
                aria-label={`Select row ${rowId}`}
                checked={isSelected}
                onCheckedChange={(value) =>
                  handleToggleRow(rowId, value === true)
                }
                disabled={isDisabled}
                onClick={(e) => e.stopPropagation()}
              />
            </TableCell>
          )}
          {columns.map((col) => {
            const cellCls =
              typeof col.cellClassName === "function"
                ? col.cellClassName(row)
                : col.cellClassName;
            return (
              <TableCell
                key={col.id}
                className={cn(cellCls, col.hideOnMobile && bp?.colClass)}
              >
                {col.cell(row, index)}
              </TableCell>
            );
          })}
          {actions && (
            <TableCell
              className="w-1 whitespace-nowrap text-right"
              onClick={(e) => e.stopPropagation()}
            >
              {actions(row)}
            </TableCell>
          )}
        </>
      );
      if (renderRow) {
        return (
          <Fragment key={rowKey}>
            {renderRow(row, cells, { index, rowKey, isSelected })}
          </Fragment>
        );
      }
      return (
        <TableRow
          key={rowKey}
          data-state={isSelected ? "selected" : undefined}
          className={cn(computedRowClass, onRowClick && "cursor-pointer")}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
        >
          {cells}
        </TableRow>
      );
    });
  })();

  // ----- mobile cards pane -----
  const mobilePane =
    renderMobileCard && bp ? (
      <div className={cn(bp.cardClass, "space-y-3")}>
        {isLoading ? (
          Array.from({ length: skeletonRows }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-md border bg-muted/40"
            />
          ))
        ) : isEmpty ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{emptyState?.title ?? "No results"}</EmptyTitle>
              {emptyState?.description && (
                <EmptyDescription>{emptyState.description}</EmptyDescription>
              )}
            </EmptyHeader>
            {emptyState?.action && (
              <EmptyContent>{emptyState.action}</EmptyContent>
            )}
          </Empty>
        ) : (
          data.map((row, index) => (
            <Fragment key={getRowKey(row, index)}>
              {renderMobileCard(row, index)}
            </Fragment>
          ))
        )}
      </div>
    ) : null;

  return (
    <div className={className}>
      {mobilePane}
      <div className={bp?.tableClass}>
        <Table className={tableClassName} aria-label={ariaLabel}>
          <TableHeader>{headerRow}</TableHeader>
          <TableBody>{body}</TableBody>
        </Table>
      </div>
    </div>
  );
}
