"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import {
  useCompaniesPaginated,
  useCompany,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from "../../hooks/use-companies";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Plus,
  Search,
  Globe,
  Phone,
  MapPin,
  Building2,
  Pencil,
  Trash2,
} from "lucide-react";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import { CompanyForm } from "./CompanyForm";
import type { CreateCompanyData } from "../../services/company.service";

type DrawerMode = "view" | "new" | "edit" | null;

export function CompaniesPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const isDesktop = useIsDesktop();

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useCompaniesPaginated({
    page,
    limit: pageSize,
    search,
  });
  const { data: selectedCompanyData } = useCompany(selectedId ?? "");
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();
  const deleteMutation = useDeleteCompany();

  const companies = data?.data ?? [];
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

  const openNew = () => {
    if (isDesktop) {
      setSelectedId(null);
      setDrawerMode("new");
    } else {
      router.push(`${basePath}/crm/companies/new`);
    }
  };

  const openView = (id: string) => {
    setSelectedId(id);
    setDrawerMode("view");
  };

  const openEdit = (id: string) => {
    if (isDesktop) {
      setSelectedId(id);
      setDrawerMode("edit");
    } else {
      router.push(`${basePath}/crm/companies/${id}/edit`);
    }
  };

  const closeDrawer = () => {
    setDrawerMode(null);
    setSelectedId(null);
  };

  const handleCreate = async (data: CreateCompanyData) => {
    await createMutation.mutateAsync(data);
    toast({ title: "Company created" });
    closeDrawer();
  };

  const handleUpdate = async (data: CreateCompanyData) => {
    if (!selectedId) return;
    await updateMutation.mutateAsync({ id: selectedId, data });
    toast({ title: "Company updated" });
    setDrawerMode("view");
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this company?")) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast({ title: "Company deleted" });
        if (selectedId === id) closeDrawer();
      },
      onError: () =>
        toast({ title: "Failed to delete company", variant: "destructive" }),
    });
  };

  const drawerTitle =
    drawerMode === "new"
      ? "Add Company"
      : drawerMode === "edit"
        ? "Edit Company"
        : "Company Details";

  const selectedCompany = selectedCompanyData?.company ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Companies</h1>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(DEFAULT_PAGE);
          }}
          className="pl-9"
        />
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
        ) : companies.length === 0 ? (
          <div className="rounded-md border py-8 text-center text-muted-foreground">
            No companies found. Add one to get started.
          </div>
        ) : (
          companies.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border bg-card p-3 space-y-2 cursor-pointer"
              onClick={() => openView(c.id)}
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-semibold">{c.name}</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {c.website && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {c.website}
                  </span>
                )}
                {c.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {c.phone}
                  </span>
                )}
              </div>
              <div
                className="flex gap-1 pt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => openEdit(c.id)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => handleDelete(c.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Desktop table ────────────────────────────────────────────── */}
      <div className="hidden sm:block overflow-x-auto rounded-md border">
        {isLoading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4].map((i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-24 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No companies found. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => openView(c.id)}
                  >
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.website || "—"}</TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(c.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(c.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
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

      <ResponsiveDrawer
        open={drawerMode !== null}
        onOpenChange={(o) => !o && closeDrawer()}
        title={drawerTitle}
      >
        {drawerMode === "view" && selectedId && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-end px-6 py-3 border-b shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEdit(selectedId)}
              >
                Edit Company
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selectedCompany ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold">
                      {selectedCompany.name}
                    </h2>
                  </div>

                  <div className="grid gap-3">
                    {selectedCompany.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                        <a
                          href={selectedCompany.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate"
                        >
                          {selectedCompany.website}
                        </a>
                      </div>
                    )}
                    {selectedCompany.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <a
                          href={`tel:${selectedCompany.phone}`}
                          className="hover:underline"
                        >
                          {selectedCompany.phone}
                        </a>
                      </div>
                    )}
                    {selectedCompany.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span>{selectedCompany.address}</span>
                      </div>
                    )}
                  </div>

                  {selectedCompany._count && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border bg-card p-3 text-center">
                        <p className="text-2xl font-bold">
                          {selectedCompany._count.contacts}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Contacts
                        </p>
                      </div>
                      <div className="rounded-lg border bg-card p-3 text-center">
                        <p className="text-2xl font-bold">
                          {selectedCompany._count.deals}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Deals
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Skeleton className="h-48 w-full" />
              )}
            </div>
          </div>
        )}
        {drawerMode === "new" && (
          <CompanyForm
            mode="create"
            onSubmit={handleCreate}
            onCancel={closeDrawer}
            isLoading={createMutation.isPending}
          />
        )}
        {drawerMode === "edit" && selectedId && (
          <CompanyForm
            mode="edit"
            defaultValues={
              selectedCompany
                ? {
                    name: selectedCompany.name,
                    website: selectedCompany.website ?? undefined,
                    address: selectedCompany.address ?? undefined,
                    phone: selectedCompany.phone ?? undefined,
                  }
                : undefined
            }
            onSubmit={handleUpdate}
            onCancel={() => setDrawerMode("view")}
            isLoading={updateMutation.isPending}
          />
        )}
      </ResponsiveDrawer>
    </div>
  );
}
