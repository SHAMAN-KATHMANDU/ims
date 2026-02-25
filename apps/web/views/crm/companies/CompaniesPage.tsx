"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { PhoneInput } from "@/components/ui/phone-input";
import { useToast } from "@/hooks/useToast";
import {
  useCompaniesPaginated,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from "@/hooks/useCompanies";
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
import { Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { CreateCompanyData } from "@/services/companyService";

export function CompaniesPage() {
  const _params = useParams();
  const { toast } = useToast();

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCompanyData>({ name: "" });

  const { data, isLoading } = useCompaniesPaginated({
    page,
    limit: pageSize,
    search,
  });
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

  const handleSubmit = async () => {
    if (!formData.name?.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          data: formData,
        });
        toast({ title: "Company updated" });
      } else {
        await createMutation.mutateAsync(formData);
        toast({ title: "Company created" });
      }
      setFormOpen(false);
      setEditingId(null);
      setFormData({ name: "" });
    } catch {
      toast({ title: "Failed to save company", variant: "destructive" });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this company?")) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast({ title: "Company deleted" }),
      onError: () =>
        toast({ title: "Failed to delete company", variant: "destructive" }),
    });
  };

  const openEdit = (c: {
    id: string;
    name: string;
    website?: string | null;
    address?: string | null;
    phone?: string | null;
  }) => {
    setFormData({
      name: c.name,
      website: c.website ?? undefined,
      address: c.address ?? undefined,
      phone: c.phone ?? undefined,
    });
    setEditingId(c.id);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Companies</h1>
        <Button
          onClick={() => {
            setFormData({ name: "" });
            setEditingId(null);
            setFormOpen(true);
          }}
        >
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

      <div className="rounded-md border">
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
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.website || "—"}</TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(c)}
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Company" : "Add Company"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Company name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Website</Label>
              <Input
                value={formData.website ?? ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    website: e.target.value || undefined,
                  }))
                }
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={formData.address ?? ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    address: e.target.value || undefined,
                  }))
                }
                placeholder="Address"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <PhoneInput
                value={formData.phone ?? ""}
                onChange={(phone) =>
                  setFormData((p) => ({ ...p, phone: phone || undefined }))
                }
                placeholder="e.g. 9841234567"
                numberInputId="company-phone"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
