"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import {
  useLeadsPaginated,
  useLead,
  useUpdateLead,
  useDeleteLead,
  useConvertLead,
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
import { Search, Plus, Mail, Phone as PhoneIcon } from "lucide-react";
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
  Dialog,
  DialogContent,
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
import type { Lead, LeadStatus } from "../../services/lead.service";

const STATUS_OPTIONS: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "LOST",
  "CONVERTED",
];

const statusVariant: Record<
  LeadStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  NEW: "secondary",
  CONTACTED: "outline",
  QUALIFIED: "default",
  LOST: "destructive",
  CONVERTED: "secondary",
};

export function LeadsPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const isDesktop = useIsDesktop();
  const pipelinesEnabled = useEnvFeatureFlag(EnvFeature.CRM_PIPELINES_TAB);

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [status, setStatus] = useState<string>("__all__");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertLeadId, setConvertLeadId] = useState<string | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);

  const { data: sourcesData } = useCrmSources(undefined, {
    enabled: pipelinesEnabled,
  });
  const { data: usersResult } = useUsers({ limit: 500 });
  const sources = sourcesData?.sources ?? [];
  const users = usersResult?.users ?? [];

  const { data, isLoading } = useLeadsPaginated({
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
  const convertMutation = useConvertLead();

  const leads = data?.data ?? [];
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

  const openView = (id: string) => {
    if (isDesktop) {
      setSelectedId(id);
    } else {
      router.push(`${basePath}/crm/leads/${id}`);
    }
  };

  const openEdit = (id: string) => {
    if (isDesktop) {
      router.push(`${basePath}/crm/leads/${id}/edit`);
    } else {
      router.push(`${basePath}/crm/leads/${id}/edit`);
    }
  };

  const handleConvert = (lead: Lead) => {
    setConvertLeadId(lead.id);
    setConvertDialogOpen(true);
  };

  const confirmConvert = async () => {
    if (!convertLeadId) return;
    try {
      await convertMutation.mutateAsync({ id: convertLeadId });
      toast({ title: "Lead converted to Contact and Deal" });
      setConvertDialogOpen(false);
      setConvertLeadId(null);
      setSelectedId(null);
    } catch {
      toast({ title: "Convert failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Leads</h1>
        <Link href={`${basePath}/crm/leads/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(DEFAULT_PAGE);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(DEFAULT_PAGE);
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
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
        {pipelinesEnabled && (
          <Select
            value={sourceFilter}
            onValueChange={(v) => {
              setSourceFilter(v);
              setPage(DEFAULT_PAGE);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
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
        )}
        <Select
          value={assignedToFilter}
          onValueChange={(v) => {
            setAssignedToFilter(v);
            setPage(DEFAULT_PAGE);
          }}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
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

      {/* ── Mobile card list ─────────────────────────────────────────── */}
      <div className="sm:hidden space-y-2">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))
        ) : leads.length === 0 ? (
          <div className="rounded-md border py-8 text-center text-muted-foreground">
            No leads found
          </div>
        ) : (
          leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-lg border bg-card p-3 space-y-2 cursor-pointer"
              onClick={() => openView(lead.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold">{lead.name}</span>
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
                    <Mail className="h-3 w-3" />
                    {lead.email}
                  </span>
                )}
                {lead.phone && (
                  <span className="flex items-center gap-1">
                    <PhoneIcon className="h-3 w-3" />
                    {lead.phone}
                  </span>
                )}
                {lead.source && <span>{lead.source}</span>}
                {lead.assignedTo && <span>{lead.assignedTo.username}</span>}
              </div>
              <div
                className="flex gap-1 pt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  disabled={lead.status === "CONVERTED"}
                  onClick={() => handleConvert(lead)}
                >
                  Convert
                </Button>
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
      <div className="hidden sm:block overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No leads found
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Button
                      variant="link"
                      className="h-auto p-0 font-medium"
                      onClick={() => setSelectedId(lead.id)}
                    >
                      {lead.name}
                    </Button>
                  </TableCell>
                  <TableCell>{lead.email || "—"}</TableCell>
                  <TableCell>{lead.status}</TableCell>
                  <TableCell>{lead.source || "—"}</TableCell>
                  <TableCell>{lead.assignedTo?.username ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedId(lead.id)}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={lead.status === "CONVERTED"}
                      onClick={() => handleConvert(lead)}
                    >
                      Convert
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteLeadId(lead.id)}
                    >
                      Delete
                    </Button>
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
                <h2 className="text-xl font-semibold">{leadData.lead.name}</h2>
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
                <Button
                  disabled={leadData.lead.status === "CONVERTED"}
                  onClick={() => handleConvert(leadData.lead)}
                >
                  Convert to Contact + Deal
                </Button>
                <Link href={`${basePath}/crm/leads/${selectedId}/edit`}>
                  <Button variant="outline">Edit</Button>
                </Link>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Lead</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will create a new Contact and Deal from this lead. Continue?
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConvertDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmConvert}
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending ? "Converting..." : "Convert"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
