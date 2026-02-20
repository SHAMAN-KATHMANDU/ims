"use client";

import { useState, useMemo } from "react";
import {
  useTenantAddOns,
  useCreateTenantAddOn,
  useApproveTenantAddOn,
  useCancelTenantAddOn,
  useDeleteTenantAddOn,
} from "@/hooks/usePlatformBilling";
import type { AddOnStatus } from "@/services/usageService";
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
import { Plus, Check, X, Trash2 } from "lucide-react";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  ACTIVE: "default",
  EXPIRED: "destructive",
  CANCELLED: "destructive",
};

const ADD_ON_TYPES = [
  "EXTRA_USER",
  "EXTRA_PRODUCT",
  "EXTRA_LOCATION",
  "EXTRA_MEMBER",
  "EXTRA_CATEGORY",
  "EXTRA_CONTACT",
] as const;

const ADD_ON_STATUSES = ["PENDING", "ACTIVE", "EXPIRED", "CANCELLED"] as const;

const ADD_ON_LABELS: Record<string, string> = {
  EXTRA_USER: "Extra Users",
  EXTRA_PRODUCT: "Extra Products",
  EXTRA_LOCATION: "Extra Locations",
  EXTRA_MEMBER: "Extra Members",
  EXTRA_CATEGORY: "Extra Categories",
  EXTRA_CONTACT: "Extra Contacts",
};

type AddOnType = (typeof ADD_ON_TYPES)[number];

interface CreateAddOnForm {
  tenantId: string;
  type: AddOnType;
  quantity: string;
  notes: string;
}

const INITIAL_FORM: CreateAddOnForm = {
  tenantId: "",
  type: "EXTRA_USER",
  quantity: "1",
  notes: "",
};

export function TenantAddOnsTab() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: addOns = [], isLoading } = useTenantAddOns(
    statusFilter !== "all"
      ? { status: statusFilter as AddOnStatus }
      : undefined,
  );
  const createMutation = useCreateTenantAddOn();
  const approveMutation = useApproveTenantAddOn();
  const cancelMutation = useCancelTenantAddOn();
  const deleteMutation = useDeleteTenantAddOn();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateAddOnForm>(INITIAL_FORM);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const filtered = useMemo(() => {
    return addOns.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      return true;
    });
  }, [addOns, typeFilter]);

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

  const handleCreate = async () => {
    if (!form.tenantId.trim()) {
      toast({ title: "Tenant ID is required", variant: "destructive" });
      return;
    }
    const quantity = parseInt(form.quantity) || 1;
    if (quantity < 1) {
      toast({ title: "Quantity must be at least 1", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({
        tenantId: form.tenantId.trim(),
        type: form.type,
        quantity,
        notes: form.notes.trim() || undefined,
      });
      toast({ title: "Add-on created" });
      setCreateOpen(false);
      setForm(INITIAL_FORM);
    } catch {
      toast({ title: "Failed to create add-on", variant: "destructive" });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveMutation.mutateAsync(id);
      toast({ title: "Add-on approved" });
    } catch {
      toast({ title: "Failed to approve add-on", variant: "destructive" });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelMutation.mutateAsync(id);
      toast({ title: "Add-on cancelled" });
    } catch {
      toast({ title: "Failed to cancel add-on", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: "Add-on deleted" });
    } catch {
      toast({ title: "Failed to delete add-on", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
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
            <CardTitle>Tenant Add-Ons</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setForm(INITIAL_FORM);
                setCreateOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Create Add-On
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
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
                {ADD_ON_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44 h-8">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ADD_ON_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ADD_ON_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground py-12"
                    >
                      {addOns.length === 0
                        ? "No add-ons found. Create one to get started."
                        : "No add-ons match the current filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.tenant?.name ?? a.tenantId}
                        {a.tenant?.slug && (
                          <div className="text-xs text-muted-foreground">
                            {a.tenant.slug}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{ADD_ON_LABELS[a.type] ?? a.type}</TableCell>
                      <TableCell>{a.quantity}</TableCell>
                      <TableCell>
                        <Badge
                          variant={STATUS_VARIANT[a.status] ?? "secondary"}
                        >
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.periodStart
                          ? `${new Date(a.periodStart).toLocaleDateString()} - ${a.periodEnd ? new Date(a.periodEnd).toLocaleDateString() : "Ongoing"}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.requestedAt
                          ? new Date(a.requestedAt).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.approvedAt
                          ? new Date(a.approvedAt).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {a.status === "PENDING" && (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleApprove(a.id)}
                                disabled={approveMutation.isPending}
                                title="Approve"
                              >
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleCancel(a.id)}
                                disabled={cancelMutation.isPending}
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </>
                          )}
                          {a.status === "ACTIVE" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(a.id)}
                              disabled={cancelMutation.isPending}
                            >
                              Cancel
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() =>
                              setDeleteTarget({
                                id: a.id,
                                label: `${ADD_ON_LABELS[a.type] ?? a.type} for ${a.tenant?.name ?? a.tenantId}`,
                              })
                            }
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          if (!v) setForm(INITIAL_FORM);
          setCreateOpen(v);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Add-On</DialogTitle>
            <DialogDescription>
              Provision a resource add-on for a tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="addon-tenant">Tenant ID</Label>
              <Input
                id="addon-tenant"
                value={form.tenantId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, tenantId: e.target.value }))
                }
                placeholder="Enter tenant ID"
              />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, type: v as AddOnType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADD_ON_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ADD_ON_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="addon-qty">Quantity</Label>
              <Input
                id="addon-qty"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) =>
                  setForm((p) => ({ ...p, quantity: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="addon-notes">Notes</Label>
              <Textarea
                id="addon-notes"
                value={form.notes}
                onChange={(e) =>
                  setForm((p) => ({ ...p, notes: e.target.value }))
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
                setForm(INITIAL_FORM);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !form.tenantId.trim()}
            >
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
            <AlertDialogTitle>Delete Add-On</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium">{deleteTarget?.label}</span>. This
              action cannot be undone.
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
