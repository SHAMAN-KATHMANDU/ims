"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import {
  useLeadsPaginated,
  useLead,
  useUpdateLead,
  useDeleteLead,
  useConvertLead,
  type LeadListParams,
  type PaginatedLeadsResponse,
} from "@/hooks/useLeads";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
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
import type { Lead, LeadStatus } from "@/services/leadService";

const STATUS_OPTIONS: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "LOST",
  "CONVERTED",
];

export interface LeadsPageClientProps {
  initialData?: PaginatedLeadsResponse;
  initialParams?: LeadListParams;
}

export function LeadsPageClient({
  initialData,
  initialParams,
}: LeadsPageClientProps = {}) {
  const params = useParams();
  const _router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();

  const [page, setPage] = useState(initialParams?.page ?? DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(
    initialParams?.limit ?? DEFAULT_LIMIT,
  );
  const [search, setSearch] = useState(initialParams?.search ?? "");
  const [status, setStatus] = useState<string>(
    initialParams?.status ?? "__all__",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertLeadId, setConvertLeadId] = useState<string | null>(null);

  const { data, isLoading } = useLeadsPaginated(
    {
      page,
      limit: pageSize,
      search,
      status: status === "__all__" ? undefined : (status as LeadStatus),
    },
    { initialData },
  );

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
          <SelectTrigger className="w-[180px]">
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

      <div className="rounded-md border">
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
                      onClick={() => {
                        if (confirm("Delete this lead?")) {
                          deleteMutation.mutate(lead.id, {
                            onSuccess: () => toast({ title: "Lead deleted" }),
                            onError: () =>
                              toast({
                                title: "Delete failed",
                                variant: "destructive",
                              }),
                          });
                          if (selectedId === lead.id) setSelectedId(null);
                        }
                      }}
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
              <div className="flex gap-2">
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
    </div>
  );
}

export function LeadsPage(props: LeadsPageClientProps) {
  return <LeadsPageClient {...props} />;
}
