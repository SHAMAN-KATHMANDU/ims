"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useDebounce } from "@/hooks/useDebounce";
import { Can, PermissionGate } from "@/features/permissions";
import {
  useLeadsPaginated,
  useLead,
  useUpdateLead,
  useDeleteLead,
} from "../../hooks/use-leads";
import { useCrmSources } from "../../hooks/use-crm-settings";
import { useEnvFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@repo/shared";
import { useUsers } from "@/features/users";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Mail,
  SlidersHorizontal,
  X,
  Zap,
  Check,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import type { Lead, LeadStatus } from "../../services/lead.service";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Spinner } from "@/components/ui/spinner";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import { ConvertLeadDrawer } from "./ConvertLeadDrawer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "LOST",
  "CONVERTED",
];

const statusVariant: Record<
  LeadStatus,
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "info"
  | "warning"
  | "success"
> = {
  NEW: "info",
  CONTACTED: "secondary",
  QUALIFIED: "warning",
  LOST: "destructive",
  CONVERTED: "success",
};

function initials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function LeadsPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [status, setStatus] = useState<string>("__all__");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: sourcesData } = useCrmSources(undefined, {
    enabled: pipelinesEnabled,
  });
  const { data: usersResult } = useUsers({ limit: 500 });
  const sources = sourcesData?.sources ?? [];
  const users = usersResult?.users ?? [];

  const { data, isLoading, isFetching } = useLeadsPaginated({
    page,
    limit: pageSize,
    search: debouncedSearch,
    status: status === "__all__" ? undefined : (status as LeadStatus),
    source: sourceFilter === "all" ? undefined : sourceFilter,
    assignedToId: assignedToFilter === "all" ? undefined : assignedToFilter,
  });

  const { data: leadData } = useLead(selectedId || "");
  const _updateMutation = useUpdateLead();
  const deleteMutation = useDeleteLead();

  const leads = data?.data ?? [];

  const hasStructuredFilters =
    status !== "__all__" ||
    sourceFilter !== "all" ||
    assignedToFilter !== "all";

  const activeFilterCount =
    (status !== "__all__" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (assignedToFilter !== "all" ? 1 : 0);

  const clearLeadsFilters = () => {
    setStatus("__all__");
    setSourceFilter("all");
    setAssignedToFilter("all");
    setSearch("");
    setPage(DEFAULT_PAGE);
  };

  const assignedUserLabel =
    users.find((u) => u.id === assignedToFilter)?.username ?? null;

  const leadsEmptyNoResults =
    !isLoading &&
    leads.length === 0 &&
    (hasStructuredFilters || debouncedSearch.trim());

  const pagination = data?.pagination
    ? ({
        currentPage: data.pagination.currentPage,
        totalPages: data.pagination.totalPages,
        totalItems: data.pagination.totalItems,
        itemsPerPage: data.pagination.itemsPerPage,
        hasNextPage: data.pagination.hasNextPage,
        hasPrevPage: data.pagination.hasPrevPage,
      } as PaginationState)
    : null;

  const confirmDeleteLead = () => {
    if (!deleteLeadId) return;
    deleteMutation.mutate(deleteLeadId, {
      onSuccess: () => {
        toast({ title: "Lead deleted" });
        if (selectedId === deleteLeadId) setSelectedId(null);
        setDeleteLeadId(null);
      },
      onError: () => {
        toast({ title: "Delete failed", variant: "destructive" });
        setDeleteLeadId(null);
      },
    });
  };

  // Clicking a lead navigates to its detail page (no view sheet/drawer).
  const openView = (id: string) => {
    router.push(`${basePath}/crm/leads/${id}`);
  };

  const openEdit = (id: string) => {
    router.push(`${basePath}/crm/leads/${id}/edit`);
  };

  const handleConvert = (lead: Lead) => {
    setConvertLead(lead);
  };

  const listDimmed = isFetching && !isLoading;

  return (
    <PermissionGate perm="CRM.LEADS.VIEW">
      <PageShell className="space-y-4">
        <PageHeader
          title="Leads"
          actions={
            <Can perm="CRM.LEADS.CREATE">
              <Link href={`${basePath}/crm/leads/new`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Add Lead
                </Button>
              </Link>
            </Can>
          }
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              aria-hidden="true"
            />
            <Input
              placeholder="Search leads…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(DEFAULT_PAGE);
              }}
              className="pl-9 pr-10"
              aria-busy={isFetching && !isLoading}
            />
            {isFetching && !isLoading ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Spinner className="size-4" />
              </span>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 gap-2"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters
            {activeFilterCount > 0 ? (
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                {activeFilterCount}
              </Badge>
            ) : null}
          </Button>
        </div>

        {(activeFilterCount > 0 || debouncedSearch.trim()) && (
          <div className="flex flex-wrap items-center gap-2">
            {debouncedSearch.trim() ? (
              <Badge variant="outline" className="gap-1 pr-1 font-normal">
                <span className="text-muted-foreground">Search:</span>
                {debouncedSearch.trim()}
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearch("");
                    setPage(DEFAULT_PAGE);
                  }}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </Badge>
            ) : null}
            {status !== "__all__" ? (
              <Badge variant="outline" className="gap-1 pr-1 font-normal">
                Status: {status}
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted"
                  aria-label="Clear status filter"
                  onClick={() => {
                    setStatus("__all__");
                    setPage(DEFAULT_PAGE);
                  }}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </Badge>
            ) : null}
            {pipelinesEnabled && sourceFilter !== "all" ? (
              <Badge variant="outline" className="gap-1 pr-1 font-normal">
                Source: {sourceFilter}
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted"
                  aria-label="Clear source filter"
                  onClick={() => {
                    setSourceFilter("all");
                    setPage(DEFAULT_PAGE);
                  }}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </Badge>
            ) : null}
            {assignedToFilter !== "all" && assignedUserLabel ? (
              <Badge variant="outline" className="gap-1 pr-1 font-normal">
                Assigned: {assignedUserLabel}
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted"
                  aria-label="Clear assignee filter"
                  onClick={() => {
                    setAssignedToFilter("all");
                    setPage(DEFAULT_PAGE);
                  }}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </Badge>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-muted-foreground"
              onClick={clearLeadsFilters}
            >
              Clear all
            </Button>
          </div>
        )}

        <ResponsiveDrawer
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          title="Filters"
          description="Refine the lead list. Changes apply immediately."
          size="md"
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">Status</p>
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v);
                  setPage(DEFAULT_PAGE);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {pipelinesEnabled ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Source</p>
                <Select
                  value={sourceFilter}
                  onValueChange={(v) => {
                    setSourceFilter(v);
                    setPage(DEFAULT_PAGE);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    {sources.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <p className="text-sm font-medium">Assigned to</p>
              <Select
                value={assignedToFilter}
                onValueChange={(v) => {
                  setAssignedToFilter(v);
                  setPage(DEFAULT_PAGE);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Assigned to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={() => setFiltersOpen(false)}
            >
              Done
            </Button>
          </div>
        </ResponsiveDrawer>

        {/* ── Mobile card list ─────────────────────────────────────────── */}
        <div
          className={
            listDimmed
              ? "sm:hidden space-y-2 opacity-70 transition-opacity duration-[var(--duration-normal,200ms)]"
              : "sm:hidden space-y-2 transition-opacity duration-[var(--duration-normal,200ms)]"
          }
        >
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))
          ) : leads.length === 0 ? (
            <div className="rounded-md border py-8 px-4 text-center">
              {leadsEmptyNoResults ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    No leads match your search or filters.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearLeadsFilters}
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="space-y-1 text-muted-foreground">
                  <p className="font-medium text-foreground">No leads yet</p>
                  <p className="text-sm">
                    Add a lead to start tracking prospects.
                  </p>
                </div>
              )}
            </div>
          ) : (
            leads.map((lead) => (
              <div
                role="button"
                tabIndex={0}
                key={lead.id}
                className={cn(
                  "w-full text-left rounded-lg border bg-card p-4 space-y-3 cursor-pointer transition-colors hover:bg-secondary",
                  listDimmed && "pointer-events-none",
                )}
                onClick={() => openView(lead.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openView(lead.id);
                  }
                }}
              >
                <div className="flex items-start gap-3 justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {initials(lead.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{lead.name}</div>
                      {lead.companyName && (
                        <div className="text-xs text-muted-foreground">
                          {lead.companyName}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={statusVariant[lead.status]}
                    className="text-xs shrink-0"
                  >
                    {lead.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {lead.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" aria-hidden="true" />
                      {lead.email}
                    </span>
                  )}
                  {lead.source && <span>{lead.source}</span>}
                  {lead.assignedTo && <span>{lead.assignedTo.username}</span>}
                </div>
                {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- stopPropagation wrapper inside a button; keyboard handled by parent */}
                <div
                  className="flex gap-2 pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Can perm="CRM.LEADS.CONVERT">
                    {lead.status === "CONVERTED" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs flex-1"
                        disabled
                      >
                        Converted
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={() => handleConvert(lead)}
                      >
                        Convert
                      </Button>
                    )}
                  </Can>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-1"
                    onClick={() => openEdit(lead.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => setDeleteLeadId(lead.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Desktop table ────────────────────────────────────────────── */}
        <div
          className={
            listDimmed
              ? "hidden sm:block overflow-x-auto rounded-xl border bg-card shadow-sm opacity-70 transition-opacity duration-[var(--duration-normal,200ms)]"
              : "hidden sm:block overflow-x-auto rounded-xl border bg-card shadow-sm transition-opacity duration-[var(--duration-normal,200ms)]"
          }
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Lead</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3, 4].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-24 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 px-4">
                    {leadsEmptyNoResults ? (
                      <div className="space-y-3">
                        <p className="text-muted-foreground text-sm">
                          No leads match your search or filters.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearLeadsFilters}
                        >
                          Clear filters
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-muted-foreground">
                        <p className="font-medium text-foreground">
                          No leads yet
                        </p>
                        <p className="text-sm">
                          Add a lead to start tracking prospects.
                        </p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="hover:bg-secondary transition-colors"
                  >
                    <TableCell>
                      <button
                        type="button"
                        className="flex items-center gap-3 text-left"
                        onClick={() => openView(lead.id)}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {initials(lead.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-semibold">
                            {lead.name}
                          </div>
                          {lead.email && (
                            <div className="text-[11.5px] text-muted-foreground">
                              {lead.email}
                            </div>
                          )}
                        </div>
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.companyName || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.source || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.assignedTo?.username ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[lead.status]}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Can perm="CRM.LEADS.CONVERT">
                          {lead.status === "CONVERTED" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled
                              className="text-muted-foreground"
                            >
                              <Check className="h-4 w-4" /> Converted
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleConvert(lead)}
                            >
                              <Zap className="h-4 w-4" /> Convert
                            </Button>
                          )}
                        </Can>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteLeadId(lead.id)}
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

        {pagination && (
          <DataTablePagination
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(DEFAULT_PAGE);
            }}
          />
        )}

        <Sheet
          open={!!selectedId}
          onOpenChange={(o) => !o && setSelectedId(null)}
        >
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Lead Details</SheetTitle>
            </SheetHeader>
            {selectedId && leadData?.lead && (
              <div className="space-y-4 py-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {leadData.lead.name}
                  </h2>
                  {leadData.lead.email && (
                    <p className="text-sm">{leadData.lead.email}</p>
                  )}
                  {leadData.lead.phone && (
                    <p className="text-sm text-muted-foreground">
                      {leadData.lead.phone}
                    </p>
                  )}
                  <p className="text-sm mt-2">
                    Status:{" "}
                    <span className="font-medium">{leadData.lead.status}</span>
                  </p>
                  {leadData.lead.source && (
                    <p className="text-sm">Source: {leadData.lead.source}</p>
                  )}
                  {leadData.lead.notes && (
                    <p className="text-sm mt-2">{leadData.lead.notes}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Can perm="CRM.LEADS.CONVERT">
                    {leadData.lead.status === "CONVERTED" ? (
                      <Button disabled>Converted</Button>
                    ) : (
                      <Button onClick={() => handleConvert(leadData.lead)}>
                        Convert to Contact + Deal
                      </Button>
                    )}
                  </Can>
                  <Link href={`${basePath}/crm/leads/${selectedId}/edit`}>
                    <Button variant="outline">Edit</Button>
                  </Link>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        <ConvertLeadDrawer
          lead={convertLead}
          open={!!convertLead}
          onOpenChange={(o) => !o && setConvertLead(null)}
        />

        <AlertDialog
          open={!!deleteLeadId}
          onOpenChange={(o) => !o && setDeleteLeadId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteLead}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageShell>
    </PermissionGate>
  );
}
