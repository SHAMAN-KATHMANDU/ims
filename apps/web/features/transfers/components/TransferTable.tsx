"use client";

import { format } from "date-fns";
import {
  ArrowRight,
  CheckCircle,
  Eye,
  MoreHorizontal,
  PackageCheck,
  Truck,
  XCircle,
} from "lucide-react";
import { useCan } from "@/features/permissions";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type Transfer,
  canApprove,
  canCancel,
  canComplete,
  canStartTransit,
  getStatusLabel,
} from "../hooks/use-transfers";

interface TransferTableProps {
  transfers: Transfer[];
  isLoading?: boolean;
  canManage: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc" | "none";
  onSort?: (sortBy: string, sortOrder: "asc" | "desc" | "none") => void;
  onView: (transfer: Transfer) => void;
  onApprove: (transfer: Transfer) => void;
  onApproveAndFulfill?: (transfer: Transfer) => void;
  fulfillingTransferId?: string | null;
  onStartTransit: (transfer: Transfer) => void;
  onComplete: (transfer: Transfer) => void;
  onCancel: (transfer: Transfer) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

function getStatusBadgeVariant(
  status: Transfer["status"],
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PENDING":
      return "secondary";
    case "APPROVED":
      return "default";
    case "IN_TRANSIT":
      return "outline";
    case "COMPLETED":
      return "default";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

export function TransferTable({
  transfers,
  isLoading,
  canManage,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onApprove,
  onApproveAndFulfill,
  fulfillingTransferId,
  onStartTransit,
  onComplete,
  onCancel,
  hasActiveFilters,
  onClearFilters,
}: TransferTableProps) {
  const { allowed: canApproveTransfer } = useCan("INVENTORY.TRANSFERS.APPROVE");
  const { allowed: canStartTransfer } = useCan(
    "INVENTORY.TRANSFERS.START_TRANSIT",
  );
  const { allowed: canCompleteTransfer } = useCan(
    "INVENTORY.TRANSFERS.COMPLETE",
  );
  const { allowed: canCancelTransfer } = useCan("INVENTORY.TRANSFERS.CANCEL");
  const columns: DataTableColumn<Transfer>[] = [
    {
      id: "transferCode",
      header: "Transfer Code",
      sortKey: "transferCode",
      cellClassName: "font-mono font-medium",
      cell: (t) => t.transferCode,
    },
    {
      id: "fromLocation",
      header: "From",
      sortKey: "fromLocationName",
      cellClassName: "font-medium text-sm",
      cell: (t) => t.fromLocation.name,
    },
    {
      id: "toLocation",
      header: "To",
      sortKey: "toLocationName",
      cellClassName: "font-medium text-sm",
      cell: (t) => (
        <span className="inline-flex items-center gap-1.5">
          <ArrowRight
            className="h-3 w-3 text-muted-foreground shrink-0"
            aria-hidden="true"
          />
          {t.toLocation.name}
        </span>
      ),
    },
    {
      id: "items",
      header: "Items",
      cell: (t) => t._count?.items || 0,
    },
    {
      id: "status",
      header: "Status",
      sortKey: "status",
      cell: (t) => (
        <Badge variant={getStatusBadgeVariant(t.status)}>
          {getStatusLabel(t.status)}
        </Badge>
      ),
    },
    {
      id: "createdAt",
      header: "Created",
      sortKey: "createdAt",
      cellClassName: "text-muted-foreground",
      cell: (t) => format(new Date(t.createdAt), "MMM d, yyyy"),
    },
  ];

  return (
    <DataTable<Transfer>
      data={transfers}
      columns={columns}
      getRowKey={(t) => t.id}
      isLoading={isLoading}
      skeletonRows={3}
      sort={
        onSort
          ? { sortBy: sortBy ?? "", sortOrder: sortOrder ?? "none", onSort }
          : undefined
      }
      rowClassName={(t) =>
        fulfillingTransferId === t.id ? "opacity-60" : undefined
      }
      emptyState={{
        title: hasActiveFilters
          ? "No transfers match your filters"
          : "No transfers yet",
        description: hasActiveFilters
          ? "Try adjusting your search or filters."
          : "Create a transfer to move products between locations.",
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
      actionsHeader="Actions"
      actions={(t) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Actions for transfer ${t.transferCode}`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(t)}>
              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
              View Details
            </DropdownMenuItem>
            {canManage && (
              <>
                <DropdownMenuSeparator />
                {canApprove(t) && canApproveTransfer && onApproveAndFulfill && (
                  <DropdownMenuItem
                    disabled={fulfillingTransferId === t.id}
                    onClick={() => onApproveAndFulfill(t)}
                  >
                    <PackageCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                    Approve &amp; move stock
                  </DropdownMenuItem>
                )}
                {canApprove(t) && canApproveTransfer && (
                  <DropdownMenuItem
                    disabled={fulfillingTransferId === t.id}
                    onClick={() => onApprove(t)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                    Approve only
                  </DropdownMenuItem>
                )}
                {canStartTransit(t) && canStartTransfer && (
                  <DropdownMenuItem onClick={() => onStartTransit(t)}>
                    <Truck className="mr-2 h-4 w-4" aria-hidden="true" />
                    Start Transit
                  </DropdownMenuItem>
                )}
                {canComplete(t) && canCompleteTransfer && (
                  <DropdownMenuItem onClick={() => onComplete(t)}>
                    <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                    Complete
                  </DropdownMenuItem>
                )}
                {canCancel(t) && canCancelTransfer && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onCancel(t)}
                  >
                    <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                    Cancel
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    />
  );
}
