"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTenants, useDeactivateTenant } from "@/hooks/useTenant";
import { usePlans } from "@/hooks/usePlatformBilling";
import { CreateTenantDialog } from "@/views/tenants/components/CreateTenantDialog";
import { useToast } from "@/hooks/useToast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";
import {
  Plus,
  Search,
  MoreHorizontal,
  ExternalLink,
  Edit2,
  Ban,
} from "lucide-react";

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

export function TenantOverviewTab() {
  const { data: tenants = [], isLoading } = useTenants();
  const { data: plans = [] } = usePlans();
  const deactivateMutation = useDeactivateTenant();
  const { toast } = useToast();
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "superadmin";

  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [createOpen, setCreateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const uniquePlans = useMemo(() => {
    const set = new Set(tenants.map((t) => t.plan));
    return Array.from(set).sort();
  }, [tenants]);

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.name.toLowerCase().includes(q) &&
          !t.slug.toLowerCase().includes(q)
        )
          return false;
      }
      if (planFilter !== "all" && t.plan !== planFilter) return false;
      if (statusFilter !== "all" && t.subscriptionStatus !== statusFilter)
        return false;
      if (activeFilter === "active" && !t.isActive) return false;
      if (activeFilter === "inactive" && t.isActive) return false;
      return true;
    });
  }, [tenants, search, planFilter, statusFilter, activeFilter]);

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

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await deactivateMutation.mutateAsync(deactivateTarget.id);
      toast({ title: "Tenant deactivated" });
    } catch {
      toast({ title: "Failed to deactivate tenant", variant: "destructive" });
    } finally {
      setDeactivateTarget(null);
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
            <CardTitle>All Tenants</CardTitle>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> New Tenant
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name or slug..."
                className="pl-8 h-8 w-56"
              />
            </div>
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
                {(plans.length > 0
                  ? plans.map((p) => ({
                      key: p.tier,
                      label: `${p.name} (${p.tier})`,
                    }))
                  : uniquePlans.map((p) => ({ key: p, label: p }))
                ).map(({ key, label }) => (
                  <SelectItem key={key} value={key}>
                    {label}
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
              value={activeFilter}
              onValueChange={(v) => {
                setActiveFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Active" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-muted-foreground py-12"
                    >
                      {tenants.length === 0
                        ? "No tenants yet. Create your first tenant to get started."
                        : "No tenants match the current filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((t) => (
                    <TableRow key={t.id} className="group">
                      <TableCell>
                        <Link
                          href={`/${workspace}/platform/billing?tenant=${t.id}`}
                          className="block hover:underline"
                        >
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {t.slug}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.plan}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            STATUS_VARIANT[t.subscriptionStatus] ?? "secondary"
                          }
                        >
                          {t.subscriptionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>{t._count?.users ?? 0}</TableCell>
                      <TableCell>{t._count?.products ?? 0}</TableCell>
                      <TableCell>{t._count?.locations ?? 0}</TableCell>
                      <TableCell>{t._count?.members ?? 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.planExpiresAt
                          ? new Date(t.planExpiresAt).toLocaleDateString()
                          : t.isTrial && t.trialEndsAt
                            ? `Trial: ${new Date(t.trialEndsAt).toLocaleDateString()}`
                            : "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/${workspace}/platform/billing?tenant=${t.id}`}
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Detail
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/${workspace}/platform/billing?tenant=${t.id}&action=edit`}
                              >
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            {t.isActive && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  setDeactivateTarget({
                                    id: t.id,
                                    name: t.name,
                                  })
                                }
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      <CreateTenantDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate{" "}
              <span className="font-medium">{deactivateTarget?.name}</span>. The
              tenant and all its users will lose access. This can be reversed
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivateMutation.isPending ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
