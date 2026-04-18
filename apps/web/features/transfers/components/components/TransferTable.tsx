"use client";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  CheckCircle,
  Truck,
  XCircle,
  ArrowRight,
  Package,
  PackageCheck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type Transfer,
  getStatusLabel,
  canApprove,
  canStartTransit,
  canComplete,
  canCancel,
} from "../../hooks/use-transfers";
import { format } from "date-fns";

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
  const canSort = Boolean(onSort);
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transfer Code</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (transfers.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="rounded-md border p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">
            No transfers match your filters
          </h3>
          <p className="text-muted-foreground mt-2">
            Try adjusting your search or filters.
          </p>
          {onClearFilters && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={onClearFilters}
            >
              Clear filters
            </Button>
          )}
        </div>
      );
    }
    return (
      <div className="rounded-md border p-8 text-center">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No transfers yet</h3>
        <p className="text-muted-foreground mt-2">
          Create a transfer to move products between locations.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {canSort ? (
              <>
                <SortableTableHead
                  sortKey="transferCode"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={onSort!}
                >
                  Transfer Code
                </SortableTableHead>
                <SortableTableHead
                  sortKey="fromLocationName"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={onSort!}
                >
                  From
                </SortableTableHead>
                <SortableTableHead
                  sortKey="toLocationName"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={onSort!}
                >
                  To
                </SortableTableHead>
                <TableHead>Items</TableHead>
                <SortableTableHead
                  sortKey="status"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={onSort!}
                >
                  Status
                </SortableTableHead>
                <SortableTableHead
                  sortKey="createdAt"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={onSort!}
                >
                  Created
                </SortableTableHead>
              </>
            ) : (
              <>
                <TableHead>Transfer Code</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </>
            )}
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.map((transfer) => (
            <TableRow key={transfer.id}>
              <TableCell className="font-mono font-medium">
                {transfer.transferCode}
              </TableCell>
              <TableCell className="font-medium text-sm">
                {transfer.fromLocation.name}
              </TableCell>
              <TableCell className="font-medium text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  {transfer.toLocation.name}
                </span>
              </TableCell>
              <TableCell>{transfer._count?.items || 0}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(transfer.status)}>
                  {getStatusLabel(transfer.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(transfer.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(transfer)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {canManage && (
                      <>
                        <DropdownMenuSeparator />
                        {canApprove(transfer) && onApproveAndFulfill && (
                          <DropdownMenuItem
                            disabled={fulfillingTransferId === transfer.id}
                            onClick={() => onApproveAndFulfill(transfer)}
                          >
                            <PackageCheck className="mr-2 h-4 w-4" />
                            Approve &amp; move stock
                          </DropdownMenuItem>
                        )}
                        {canApprove(transfer) && (
                          <DropdownMenuItem
                            disabled={fulfillingTransferId === transfer.id}
                            onClick={() => onApprove(transfer)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve only
                          </DropdownMenuItem>
                        )}
                        {canStartTransit(transfer) && (
                          <DropdownMenuItem
                            onClick={() => onStartTransit(transfer)}
                          >
                            <Truck className="mr-2 h-4 w-4" />
                            Start Transit
                          </DropdownMenuItem>
                        )}
                        {canComplete(transfer) && (
                          <DropdownMenuItem
                            onClick={() => onComplete(transfer)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Complete
                          </DropdownMenuItem>
                        )}
                        {canCancel(transfer) && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onCancel(transfer)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
