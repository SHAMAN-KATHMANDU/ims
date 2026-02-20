"use client";

import { useMemo, useState } from "react";
import {
  useSubscriptions,
  useCreateSubscription,
  useUpdateSubscription,
  useDeleteSubscription,
  useCheckSubscriptionExpiry,
  usePlans,
} from "@/hooks/usePlatformBilling";
import { useTenants } from "@/hooks/useTenant";
import type { Subscription, Plan } from "@/hooks/usePlatformBilling";
import { useToast } from "@/hooks/useToast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  TRIAL: "secondary",
  ACTIVE: "default",
  PAST_DUE: "outline",
  SUSPENDED: "destructive",
  LOCKED: "destructive",
  CANCELLED: "destructive",
};

const STATUSES = [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "SUSPENDED",
  "LOCKED",
  "CANCELLED",
] as const;

const BILLING_CYCLES = ["MONTHLY", "ANNUAL"] as const;

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

export function SubscriptionsTab() {
  const { data: subscriptions = [], isLoading } = useSubscriptions();
  const { data: plans = [] } = usePlans();
  const { data: tenants = [] } = useTenants();
  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();
  const deleteMutation = useDeleteSubscription();
  const expiryMutation = useCheckSubscriptionExpiry();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cycleFilter, setCycleFilter] = useState("all");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({
    tenantId: "",
    plan: "",
    billingCycle: "MONTHLY",
    currentPeriodStart: "",
    currentPeriodEnd: "",
    trialEndsAt: "",
  });

  const filtered = useMemo(() => {
    return subscriptions.filter((s) => {
      if (planFilter !== "all" && s.plan !== planFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (cycleFilter !== "all" && s.billingCycle !== cycleFilter) return false;
      return true;
    });
  }, [subscriptions, planFilter, statusFilter, cycleFilter]);

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

  const uniquePlans = useMemo(() => {
    const set = new Set(subscriptions.map((s) => s.plan));
    return Array.from(set).sort();
  }, [subscriptions]);

  const resetForm = () => {
    setForm({
      tenantId: "",
      plan: "",
      billingCycle: "MONTHLY",
      currentPeriodStart: "",
      currentPeriodEnd: "",
      trialEndsAt: "",
    });
  };

  const handleCreate = async () => {
    if (!form.tenantId || !form.plan) {
      toast({
        title: "Tenant ID and Plan are required",
        variant: "destructive",
      });
      return;
    }
    try {
      await createMutation.mutateAsync({
        tenantId: form.tenantId,
        plan: form.plan,
        billingCycle: form.billingCycle,
        ...(form.currentPeriodStart && {
          currentPeriodStart: form.currentPeriodStart,
        }),
        ...(form.currentPeriodEnd && {
          currentPeriodEnd: form.currentPeriodEnd,
        }),
        ...(form.trialEndsAt && { trialEndsAt: form.trialEndsAt }),
      });
      toast({ title: "Subscription created" });
      setCreateOpen(false);
      resetForm();
    } catch {
      toast({ title: "Failed to create subscription", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: { status } });
      toast({ title: "Subscription updated" });
      setEditingId(null);
    } catch {
      toast({ title: "Failed to update subscription", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: "Subscription deleted" });
    } catch {
      toast({ title: "Failed to delete subscription", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleCheckExpiry = async () => {
    try {
      const result = await expiryMutation.mutateAsync();
      const { activeToPastDue, pastDueToSuspended, trialToSuspended } =
        result.updated;
      toast({
        title: "Expiry check complete",
        description: `Past due: ${activeToPastDue}, Suspended: ${pastDueToSuspended + trialToSuspended}`,
      });
    } catch {
      toast({ title: "Expiry check failed", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Subscriptions</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select
                value={planFilter}
                onValueChange={(v) => {
                  setPlanFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-36 h-8">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  {uniquePlans.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={cycleFilter}
                onValueChange={(v) => {
                  setCycleFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-36 h-8">
                  <SelectValue placeholder="Cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cycles</SelectItem>
                  {BILLING_CYCLES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckExpiry}
                disabled={expiryMutation.isPending}
              >
                {expiryMutation.isPending ? "Checking..." : "Check Expiry"}
              </Button>

              <Button size="sm" onClick={() => setCreateOpen(true)}>
                Create Subscription
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
                  <TableHead>Plan</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period Start</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Trial Ends</TableHead>
                  <TableHead>Grace Period</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-muted-foreground py-12"
                    >
                      No subscriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">
                        {sub.tenant?.name ?? sub.tenantId}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sub.plan}</Badge>
                      </TableCell>
                      <TableCell>{sub.billingCycle}</TableCell>
                      <TableCell>
                        {editingId === sub.id ? (
                          <Select
                            defaultValue={sub.status}
                            onValueChange={(v) => handleStatusChange(sub.id, v)}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant={STATUS_VARIANT[sub.status] ?? "secondary"}
                          >
                            {sub.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(sub.currentPeriodStart)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(sub.currentPeriodEnd)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(sub.trialEndsAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(sub.gracePeriodEnd)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setEditingId(editingId === sub.id ? null : sub.id)
                            }
                          >
                            {editingId === sub.id ? "Cancel" : "Edit"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(sub)}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Subscription</DialogTitle>
            <DialogDescription>
              Add a new subscription for a tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sub-tenant">Tenant</Label>
              <Select
                value={form.tenantId}
                onValueChange={(v) => setForm((f) => ({ ...f, tenantId: v }))}
              >
                <SelectTrigger id="sub-tenant">
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sub-plan">Plan</Label>
              <Select
                value={form.plan}
                onValueChange={(v) => setForm((f) => ({ ...f, plan: v }))}
              >
                <SelectTrigger id="sub-plan">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p: Plan) => (
                    <SelectItem key={p.id} value={p.tier}>
                      {p.name} ({p.tier})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sub-cycle">Billing Cycle</Label>
              <Select
                value={form.billingCycle}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, billingCycle: v }))
                }
              >
                <SelectTrigger id="sub-cycle">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sub-start">Period Start</Label>
                <Input
                  id="sub-start"
                  type="date"
                  value={form.currentPeriodStart}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      currentPeriodStart: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sub-end">Period End</Label>
                <Input
                  id="sub-end"
                  type="date"
                  value={form.currentPeriodEnd}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      currentPeriodEnd: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sub-trial">Trial Ends At</Label>
              <Input
                id="sub-trial"
                type="date"
                value={form.trialEndsAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, trialEndsAt: e.target.value }))
                }
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
              {createMutation.isPending ? "Creating..." : "Create"}
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
            <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the subscription for{" "}
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
