"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import {
  useTenants,
  useDeactivateTenant,
  type Tenant,
  type PlanTier,
  type SubscriptionStatus,
} from "../hooks/use-tenants";
import { TenantTable } from "./TenantTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useDebounce } from "@/hooks/useDebounce";
import { DEFAULT_PAGE } from "@/lib/apiTypes";
import { Plus, Search } from "lucide-react";
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

const DEFAULT_TENANT_PAGE_SIZE = 10;

export function TenantsPage() {
  const params = useParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_TENANT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading } = useTenants({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    plan: planFilter === "all" ? undefined : (planFilter as PlanTier),
    subscriptionStatus:
      statusFilter === "all" ? undefined : (statusFilter as SubscriptionStatus),
    isActive: activeOnly ? true : undefined,
  });
  const tenants = data?.tenants ?? [];
  const pagination = data?.pagination;
  const deactivateMutation = useDeactivateTenant();
  const [tenantToDeactivate, setTenantToDeactivate] = useState<Tenant | null>(
    null,
  );

  const handleDeactivate = (tenant: Tenant) => {
    setTenantToDeactivate(tenant);
  };

  const confirmDeactivate = async () => {
    if (!tenantToDeactivate) return;
    try {
      await deactivateMutation.mutateAsync(tenantToDeactivate.id);
      toast({ title: "Tenant deactivated" });
      setTenantToDeactivate(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to deactivate";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenants</h1>
          <p className="text-muted-foreground mt-1">
            Manage organizations and their subscriptions
          </p>
        </div>
        <Button asChild>
          <Link
            href={`${basePath}/platform/tenants/new`}
            className="inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New tenant
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Search tenants by name or slug"
            placeholder="Search by name or slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(DEFAULT_PAGE);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={planFilter}
          onValueChange={(v) => {
            setPlanFilter(v);
            setPage(DEFAULT_PAGE);
          }}
        >
          <SelectTrigger className="w-[160px]" aria-label="Filter by plan">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="STARTER">Starter</SelectItem>
            <SelectItem value="PROFESSIONAL">Professional</SelectItem>
            <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(DEFAULT_PAGE);
          }}
        >
          <SelectTrigger
            className="w-[160px]"
            aria-label="Filter by subscription status"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="TRIAL">Trial</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAST_DUE">Past due</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="LOCKED">Locked</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch
            id="active-only"
            checked={activeOnly}
            onCheckedChange={(checked) => {
              setActiveOnly(checked);
              setPage(DEFAULT_PAGE);
            }}
          />
          <Label htmlFor="active-only" className="cursor-pointer">
            Active only
          </Label>
        </div>
      </div>

      <TenantTable
        tenants={tenants}
        isLoading={isLoading}
        basePath={basePath}
        onDeactivate={handleDeactivate}
      />

      {pagination && (
        <DataTablePagination
          pagination={{
            currentPage: pagination.currentPage,
            totalPages: pagination.totalPages,
            totalItems: pagination.totalItems,
            itemsPerPage: pagination.itemsPerPage,
            hasNextPage: pagination.hasNextPage,
            hasPrevPage: pagination.hasPrevPage,
          }}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(DEFAULT_PAGE);
          }}
          isLoading={isLoading}
        />
      )}

      <AlertDialog
        open={!!tenantToDeactivate}
        onOpenChange={(open) => !open && setTenantToDeactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              {tenantToDeactivate && (
                <>
                  This will deactivate{" "}
                  <strong>{tenantToDeactivate.name}</strong> (
                  {tenantToDeactivate.slug}). Users will not be able to log in
                  until the tenant is activated again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
