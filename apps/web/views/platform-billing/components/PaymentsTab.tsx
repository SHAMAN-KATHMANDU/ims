"use client";

import { useMemo, useState } from "react";
import {
  usePayments,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
} from "@/hooks/usePlatformBilling";
import type { TenantPayment } from "@/hooks/usePlatformBilling";
import { useToast } from "@/hooks/useToast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  COMPLETED: "default",
  FAILED: "outline",
  REFUNDED: "destructive",
};

const PAYMENT_STATUSES = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
] as const;

const GATEWAYS = [
  "ESEWA",
  "KHALTI",
  "FONEPAY",
  "CONNECTIPS",
  "BANK_TRANSFER",
  "MANUAL",
] as const;

const BILLING_CYCLES = ["MONTHLY", "ANNUAL"] as const;

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function formatCurrency(amount: string | number): string {
  return `NPR ${Number(amount).toLocaleString()}`;
}

export function PaymentsTab() {
  const { data: payments = [], isLoading } = usePayments();
  const createMutation = useCreatePayment();
  const updateMutation = useUpdatePayment();
  const deleteMutation = useDeletePayment();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [statusFilter, setStatusFilter] = useState("all");
  const [gatewayFilter, setGatewayFilter] = useState("all");

  const [deleteTarget, setDeleteTarget] = useState<TenantPayment | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({
    tenantId: "",
    subscriptionId: "",
    amount: "",
    gateway: "MANUAL",
    paidFor: "",
    billingCycle: "MONTHLY",
    periodStart: "",
    periodEnd: "",
    notes: "",
  });

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (gatewayFilter !== "all" && p.gateway !== gatewayFilter) return false;
      return true;
    });
  }, [payments, statusFilter, gatewayFilter]);

  const revenueSummary = useMemo(() => {
    const completed = payments.filter((p) => p.status === "COMPLETED");
    const pending = payments.filter((p) => p.status === "PENDING");
    const failed = payments.filter((p) => p.status === "FAILED");
    return {
      totalCompleted: completed.reduce((sum, p) => sum + Number(p.amount), 0),
      pendingAmount: pending.reduce((sum, p) => sum + Number(p.amount), 0),
      failedCount: failed.length,
    };
  }, [payments]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const pagination: PaginationState = {
    currentPage: safePage,
    totalPages,
    totalItems,
    itemsPerPage: pageSize,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };

  const resetForm = () => {
    setForm({
      tenantId: "",
      subscriptionId: "",
      amount: "",
      gateway: "MANUAL",
      paidFor: "",
      billingCycle: "MONTHLY",
      periodStart: "",
      periodEnd: "",
      notes: "",
    });
  };

  const handleCreate = async () => {
    if (
      !form.tenantId ||
      !form.subscriptionId ||
      !form.amount ||
      !form.paidFor
    ) {
      toast({
        title: "Tenant ID, Subscription ID, Amount, and Paid For are required",
        variant: "destructive",
      });
      return;
    }
    try {
      await createMutation.mutateAsync({
        tenantId: form.tenantId,
        subscriptionId: form.subscriptionId,
        amount: Number(form.amount),
        gateway: form.gateway,
        paidFor: form.paidFor,
        billingCycle: form.billingCycle,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        ...(form.notes && { notes: form.notes }),
      });
      toast({ title: "Payment recorded" });
      setCreateOpen(false);
      resetForm();
    } catch {
      toast({ title: "Failed to create payment", variant: "destructive" });
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: { status: "COMPLETED", verifiedAt: new Date().toISOString() },
      });
      toast({ title: "Payment verified" });
    } catch {
      toast({ title: "Failed to verify payment", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: "Payment deleted" });
    } catch {
      toast({ title: "Failed to delete payment", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Completed</p>
            <p className="text-2xl font-bold">
              {formatCurrency(revenueSummary.totalCompleted)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending Amount</p>
            <p className="text-2xl font-bold">
              {formatCurrency(revenueSummary.pendingAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Failed Count</p>
            <p className="text-2xl font-bold">{revenueSummary.failedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Payments</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-36 h-8">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {PAYMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={gatewayFilter}
                onValueChange={(v) => {
                  setGatewayFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-40 h-8">
                  <SelectValue placeholder="Gateway" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Gateways</SelectItem>
                  {GATEWAYS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button size="sm" onClick={() => setCreateOpen(true)}>
                Record Payment
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid For</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center text-muted-foreground py-12"
                    >
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.tenant?.name ?? p.tenantId}
                      </TableCell>
                      <TableCell>{formatCurrency(p.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.gateway}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={STATUS_VARIANT[p.status] ?? "secondary"}
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.paidFor}</TableCell>
                      <TableCell>{p.billingCycle}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(p.periodStart)} - {formatDate(p.periodEnd)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.verifiedAt ? formatDate(p.verifiedAt) : "-"}
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground max-w-[150px] truncate"
                        title={p.notes ?? undefined}
                      >
                        {p.notes ?? "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {p.status === "PENDING" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerify(p.id)}
                              disabled={updateMutation.isPending}
                            >
                              Verify
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(p)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalItems > 0 && (
            <DataTablePagination
              pagination={pagination}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Manually record a payment for a tenant subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pay-tenant">Tenant ID</Label>
                <Input
                  id="pay-tenant"
                  value={form.tenantId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tenantId: e.target.value }))
                  }
                  placeholder="Tenant ID"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-sub">Subscription ID</Label>
                <Input
                  id="pay-sub"
                  value={form.subscriptionId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subscriptionId: e.target.value }))
                  }
                  placeholder="Subscription ID"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pay-amount">Amount (NPR)</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min="0"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-gateway">Gateway</Label>
                <Select
                  value={form.gateway}
                  onValueChange={(v) => setForm((f) => ({ ...f, gateway: v }))}
                >
                  <SelectTrigger id="pay-gateway">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GATEWAYS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pay-paidfor">Paid For</Label>
                <Input
                  id="pay-paidfor"
                  value={form.paidFor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, paidFor: e.target.value }))
                  }
                  placeholder="Plan tier"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-cycle">Billing Cycle</Label>
                <Select
                  value={form.billingCycle}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, billingCycle: v }))
                  }
                >
                  <SelectTrigger id="pay-cycle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pay-start">Period Start</Label>
                <Input
                  id="pay-start"
                  type="date"
                  value={form.periodStart}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, periodStart: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-end">Period End</Label>
                <Input
                  id="pay-end"
                  type="date"
                  value={form.periodEnd}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, periodEnd: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pay-notes">Notes</Label>
              <Textarea
                id="pay-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Optional notes"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the payment of{" "}
              <span className="font-medium">
                {deleteTarget ? formatCurrency(deleteTarget.amount) : ""}
              </span>{" "}
              for{" "}
              <span className="font-medium">
                {deleteTarget?.tenant?.name ?? deleteTarget?.tenantId}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
