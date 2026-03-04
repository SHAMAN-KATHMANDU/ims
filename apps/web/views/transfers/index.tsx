"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useAuthStore, selectIsAdmin } from "@/store/auth-store";
import {
  useTransfersPaginated,
  useTransfer,
  useApproveTransfer,
  useStartTransit,
  useCompleteTransfer,
  useCancelTransfer,
  type Transfer,
  type TransferStatus,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/hooks/useTransfer";
import { TransferTable } from "./components/TransferTable";
import { TransferDetail } from "./components/TransferDetail";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Search, Plus, X } from "lucide-react";

const STATUS_OPTIONS: { value: TransferStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function TransfersPage() {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const isAdmin = useAuthStore(selectIsAdmin);

  // Filter state
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransferStatus | "ALL">(
    "ALL",
  );
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Dialog state
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(
    null,
  );
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [transferToCancel, setTransferToCancel] = useState<Transfer | null>(
    null,
  );

  // Data fetching
  const { data: transfersResponse, isLoading: transfersLoading } =
    useTransfersPaginated({
      page,
      limit: DEFAULT_LIMIT,
      search,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      sortBy,
      sortOrder,
    });

  const transfers = transfersResponse?.data ?? [];

  const { data: selectedTransfer, isLoading: transferLoading } = useTransfer(
    selectedTransferId || "",
  );

  // Mutations
  const approveTransferMutation = useApproveTransfer();
  const startTransitMutation = useStartTransit();
  const completeTransferMutation = useCompleteTransfer();
  const cancelTransferMutation = useCancelTransfer();

  // Handlers
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(DEFAULT_PAGE);
    },
    [],
  );

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value as TransferStatus | "ALL");
    setPage(DEFAULT_PAGE);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("ALL");
    setPage(DEFAULT_PAGE);
  }, []);
  const hasActiveFilters = search !== "" || statusFilter !== "ALL";

  const handleColumnSort = useCallback(
    (newSortBy: string, newSortOrder: "asc" | "desc") => {
      setSortBy(newSortBy);
      setSortOrder(newSortOrder);
      setPage(DEFAULT_PAGE);
    },
    [],
  );

  const handleView = (transfer: Transfer) => {
    setSelectedTransferId(transfer.id);
  };

  const handleApprove = async (transfer: Transfer) => {
    try {
      await approveTransferMutation.mutateAsync(transfer.id);
      toast({ title: "Transfer approved successfully" });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to approve transfer";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleStartTransit = async (transfer: Transfer) => {
    try {
      await startTransitMutation.mutateAsync(transfer.id);
      toast({ title: "Transfer marked as in transit" });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to start transit";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleComplete = async (transfer: Transfer) => {
    try {
      await completeTransferMutation.mutateAsync(transfer.id);
      toast({ title: "Transfer completed successfully" });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to complete transfer";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleCancelClick = (transfer: Transfer) => {
    setTransferToCancel(transfer);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!transferToCancel) return;

    try {
      await cancelTransferMutation.mutateAsync({
        id: transferToCancel.id,
        reason: "Cancelled by user",
      });
      toast({ title: "Transfer cancelled" });
      setCancelDialogOpen(false);
      setTransferToCancel(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel transfer";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  // For transfer detail actions
  const handleDetailApprove = async () => {
    if (!selectedTransfer) return;
    await handleApprove(selectedTransfer);
  };

  const handleDetailStartTransit = async () => {
    if (!selectedTransfer) return;
    await handleStartTransit(selectedTransfer);
  };

  const handleDetailComplete = async () => {
    if (!selectedTransfer) return;
    await handleComplete(selectedTransfer);
  };

  const handleDetailCancel = () => {
    if (!selectedTransfer) return;
    setSelectedTransferId(null);
    handleCancelClick(selectedTransfer);
  };

  const isActionLoading =
    approveTransferMutation.isPending ||
    startTransitMutation.isPending ||
    completeTransferMutation.isPending ||
    cancelTransferMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transfers</h1>
        <p className="text-muted-foreground mt-2">
          Manage product transfers between locations
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transfers..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9 w-full sm:w-[200px]"
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={clearAllFilters}
            >
              <X className="h-3.5 w-3.5 mr-2" />
              Clear filters
            </Button>
          )}
          <Button asChild variant="default" size="sm" className="sm:ml-auto">
            <Link
              href={`${basePath}/transfers/new`}
              className="inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create transfer request
            </Link>
          </Button>
        </div>
      </div>

      <TransferTable
        transfers={transfers}
        isLoading={transfersLoading}
        canManage={isAdmin}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleColumnSort}
        onView={handleView}
        onApprove={handleApprove}
        onStartTransit={handleStartTransit}
        onComplete={handleComplete}
        onCancel={handleCancelClick}
      />

      {/* Transfer Detail Dialog */}
      <TransferDetail
        open={!!selectedTransferId}
        onOpenChange={(open) => !open && setSelectedTransferId(null)}
        transfer={selectedTransfer || null}
        isLoading={transferLoading}
        canManage={isAdmin}
        onApprove={handleDetailApprove}
        onStartTransit={handleDetailStartTransit}
        onComplete={handleDetailComplete}
        onCancel={handleDetailCancel}
        actionLoading={isActionLoading}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Transfer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel transfer &quot;
              {transferToCancel?.transferCode}&quot;?
              {transferToCancel?.status === "IN_TRANSIT" &&
                " Stock will be restored to the source location."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelTransferMutation.isPending
                ? "Cancelling..."
                : "Yes, cancel transfer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
