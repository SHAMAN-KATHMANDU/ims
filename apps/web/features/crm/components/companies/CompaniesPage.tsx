"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useDebounce } from "@/hooks/useDebounce";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Globe,
  Phone,
  MapPin,
  Building2,
  Pencil,
  Trash2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
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
import { CompanyForm } from "./CompanyForm";
import type { CreateCompanyData } from "../../services/company.service";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

type DrawerMode = "view" | "new" | "edit" | null;

const DEFAULT_COMPANY_SORT = "name-asc";

const COMPANY_SORT_LABELS: Record<string, string> = {
  "name-asc": "Name (A–Z)",
  "name-desc": "Name (Z–A)",
  "createdAt-desc": "Newest first",
  "createdAt-asc": "Oldest first",
};

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
  const debouncedSearch = useDebounce(search, 300);
  const [sortValue, setSortValue] = useState<string>(DEFAULT_COMPANY_SORT);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sortBy =
    sortValue === "name-asc" || sortValue === "name-desc"
      ? "name"
      : "createdAt";
  const sortOrder = sortValue.endsWith("-desc") ? "desc" : "asc";

  const { data, isLoading, isFetching } = useCompaniesPaginated({
    page,
    limit: pageSize,
    search: debouncedSearch,
    sortBy,
    sortOrder,
  });
  const { data: selectedCompanyData } = useCompany(selectedId ?? "");
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();
  const deleteMutation = useDeleteCompany();

  const companies = data?.data ?? [];

  const sortIsNonDefault = sortValue !== DEFAULT_COMPANY_SORT;
  const companiesEmptyNoResults =
    !isLoading &&
    companies.length === 0 &&
    (sortIsNonDefault || debouncedSearch.trim());

  const clearCompaniesQuery = () => {
    setSearch("");
    setSortValue(DEFAULT_COMPANY_SORT);
    setPage(DEFAULT_PAGE);
  };

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
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast({ title: "Company deleted" });
        if (selectedId === deleteId) closeDrawer();
        setDeleteId(null);
      },
      onError: () => {
        toast({ title: "Failed to delete company", variant: "destructive" });
        setDeleteId(null);
      },
    });
  };

  const drawerTitle =
    drawerMode === "new"
      ? "Add Company"
      : drawerMode === "edit"
        ? "Edit Company"
        : "Company Details";

  const selectedCompany = selectedCompanyData?.company ?? null;

  const listDimmed = isFetching && !isLoading;

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="Companies"
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Add Company
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 max-w-xl">
          <Search
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            placeholder="Search companies…"
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
          Sort
        </Button>
      </div>

      {(debouncedSearch.trim() || sortIsNonDefault) && (
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
          {sortIsNonDefault ? (
            <Badge variant="outline" className="gap-1 pr-1 font-normal">
              Sort: {COMPANY_SORT_LABELS[sortValue] ?? sortValue}
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-muted"
                aria-label="Reset sort"
                onClick={() => {
                  setSortValue(DEFAULT_COMPANY_SORT);
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
            onClick={clearCompaniesQuery}
          >
            Clear all
          </Button>
        </div>
      )}

      <ResponsiveDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Sort"
        description="Choose how companies are ordered."
        size="sm"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Order by</p>
            <Select
              value={sortValue}
              onValueChange={(v) => {
                setSortValue(v);
                setPage(DEFAULT_PAGE);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A–Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z–A)</SelectItem>
                <SelectItem value="createdAt-desc">Newest first</SelectItem>
                <SelectItem value="createdAt-asc">Oldest first</SelectItem>
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
        ) : companies.length === 0 ? (
          <div className="rounded-md border py-8 text-center space-y-3 px-4">
            {companiesEmptyNoResults ? (
              <>
                <p className="text-muted-foreground text-sm">
                  No companies match your search or sort. Try different keywords
                  or reset sort.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCompaniesQuery}
                >
                  Clear filters
                </Button>
              </>
            ) : (
              <>
                <p className="font-medium text-foreground">No companies yet</p>
                <p className="text-sm text-muted-foreground">
                  Add a company to get started.
                </p>
              </>
            )}
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
                  <Building2
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
                <span className="text-sm font-semibold">{c.name}</span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {c.website && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" aria-hidden="true" />
                    {c.website}
                  </span>
                )}
                {c.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" aria-hidden="true" />
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
                  <Pencil className="h-3 w-3 mr-1" aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => handleDelete(c.id)}
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
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
            ? "hidden sm:block overflow-x-auto rounded-md border opacity-70 transition-opacity duration-[var(--duration-normal,200ms)]"
            : "hidden sm:block overflow-x-auto rounded-md border transition-opacity duration-[var(--duration-normal,200ms)]"
        }
      >
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
                  <TableCell colSpan={4} className="text-center py-8 px-4">
                    {companiesEmptyNoResults ? (
                      <div className="space-y-3">
                        <p className="text-muted-foreground text-sm">
                          No companies match your search or sort.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearCompaniesQuery}
                        >
                          Clear filters
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-muted-foreground">
                        <p className="font-medium text-foreground">
                          No companies yet
                        </p>
                        <p className="text-sm">Add a company to get started.</p>
                      </div>
                    )}
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
        bodyPadding={false}
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
                      <Building2
                        className="h-6 w-6 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                    <h2 className="text-xl font-semibold">
                      {selectedCompany.name}
                    </h2>
                  </div>

                  <div className="grid gap-3">
                    {selectedCompany.website && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe
                          className="h-4 w-4 text-muted-foreground shrink-0"
                          aria-hidden="true"
                        />
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
                        <Phone
                          className="h-4 w-4 text-muted-foreground shrink-0"
                          aria-hidden="true"
                        />
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
                        <MapPin
                          className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
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

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this company?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All related contacts and deals may
              be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
