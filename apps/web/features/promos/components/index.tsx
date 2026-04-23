"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import {
  usePromosPaginated,
  useCreatePromo,
  useUpdatePromo,
  useDeletePromo,
  type PromoCode,
  type CreateOrUpdatePromoData,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "../hooks/use-promos";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SortableTableHead,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";
import { useAuthStore, selectUserRole } from "@/store/auth-store";
import { useIsMobile } from "@/hooks/useMobile";
import { PromoForm } from "./PromoForm";

interface PromoPageProps {
  /** When true, page is read-only for all roles (no add/edit/delete). Used under Products. */
  readOnly?: boolean;
}

export function PromoPage({ readOnly: readOnlyProp }: PromoPageProps) {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const userRole = useAuthStore(selectUserRole);
  const readOnly = readOnlyProp === true ? true : userRole === "user";
  const isMobile = useIsMobile();

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);

  const { data: promosResponse, isLoading } = usePromosPaginated({
    page,
    limit: pageSize,
    search,
    isActive: showActiveOnly ? true : undefined,
    sortBy,
    sortOrder,
  });

  const promos = promosResponse?.data ?? [];
  const pagination = promosResponse?.pagination;

  const createMutation = useCreatePromo();
  const updateMutation = useUpdatePromo();
  const deleteMutation = useDeletePromo();

  const resetForm = () => {
    setEditingPromo(null);
  };

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(DEFAULT_PAGE);
    },
    [],
  );

  const handlePromoColumnSort = useCallback(
    (by: string, order: "asc" | "desc" | "none") => {
      if (order === "none") {
        setSortBy("createdAt");
        setSortOrder("desc");
      } else {
        setSortBy(by);
        setSortOrder(order);
      }
      setPage(DEFAULT_PAGE);
    },
    [],
  );

  const handleEdit = (promo: PromoCode) => {
    if (isMobile) {
      router.push(`${basePath}/promos/${promo.id}/edit`);
      return;
    }
    setEditingPromo(promo);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: CreateOrUpdatePromoData) => {
    try {
      if (editingPromo) {
        await updateMutation.mutateAsync({
          id: editingPromo.id,
          data,
        });
        toast({ title: "Promo code updated successfully" });
      } else {
        await createMutation.mutateAsync(data);
        toast({ title: "Promo code created successfully" });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save promo code",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (promo: PromoCode) => {
    try {
      await deleteMutation.mutateAsync(promo.id);
      toast({ title: "Promo code deactivated" });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete promo code",
        variant: "destructive",
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const promoPagination: PaginationState | null = pagination
    ? {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        totalItems: pagination.totalItems,
        itemsPerPage: pagination.itemsPerPage,
        hasNextPage: pagination.hasNextPage,
        hasPrevPage: pagination.hasPrevPage,
      }
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Promo Codes</h1>
        <p className="text-muted-foreground mt-2">
          Manage product-specific promo codes and stacking behavior
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Promo Codes</CardTitle>
            <CardDescription>
              Create and manage promo codes that apply per product
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Search by code or description..."
                value={search}
                onChange={handleSearchChange}
                className="pl-9 w-[220px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="active-only"
                checked={showActiveOnly}
                onCheckedChange={(checked) => {
                  setShowActiveOnly(checked);
                  setPage(DEFAULT_PAGE);
                }}
              />
              <label
                htmlFor="active-only"
                className="text-sm text-muted-foreground"
              >
                Show active only
              </label>
            </div>
            {!readOnly &&
              (isMobile ? (
                <Button asChild>
                  <Link href={`${basePath}/promos/new`} className="gap-2">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New Promo
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    className="gap-2"
                    onClick={() => {
                      resetForm();
                      setDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New Promo
                  </Button>
                  <PromoForm
                    open={dialogOpen}
                    onOpenChange={(o) => {
                      setDialogOpen(o);
                      if (!o) resetForm();
                    }}
                    editingPromo={editingPromo}
                    onSubmit={handleSubmit}
                    onReset={resetForm}
                    isLoading={isSaving}
                    renderTrigger={false}
                  />
                </>
              ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    sortKey="code"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handlePromoColumnSort}
                  >
                    Code
                  </SortableTableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Eligibility</TableHead>
                  <TableHead>Usage</TableHead>
                  <SortableTableHead
                    sortKey="createdAt"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handlePromoColumnSort}
                  >
                    Created
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="validFrom"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handlePromoColumnSort}
                  >
                    Valid from
                  </SortableTableHead>
                  <SortableTableHead
                    sortKey="validTo"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handlePromoColumnSort}
                  >
                    Valid to
                  </SortableTableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-6">
                      Loading promo codes...
                    </TableCell>
                  </TableRow>
                ) : promos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-6">
                      <p className="text-muted-foreground">
                        No promo codes found
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  promos.map((promo) => (
                    <TableRow key={promo.id}>
                      <TableCell className="font-mono font-medium">
                        {promo.code}
                      </TableCell>
                      <TableCell>
                        {promo.valueType === "PERCENTAGE"
                          ? "Percentage"
                          : "Flat"}
                      </TableCell>
                      <TableCell>
                        {promo.valueType === "PERCENTAGE"
                          ? `${promo.value}%`
                          : promo.value}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {promo.eligibility === "ALL"
                            ? "All"
                            : promo.eligibility === "MEMBER"
                              ? "Member"
                              : promo.eligibility === "NON_MEMBER"
                                ? "Non-member"
                                : "Wholesale"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {promo.usageLimit
                          ? `${promo.usageCount}/${promo.usageLimit}`
                          : `${promo.usageCount} used`}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {format(new Date(promo.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {promo.validFrom
                          ? format(new Date(promo.validFrom), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {promo.validTo
                          ? format(new Date(promo.validTo), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={promo.isActive ? "default" : "secondary"}
                          className={
                            promo.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {promo.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!readOnly && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(promo)}
                              aria-label={`Edit promo ${promo.code}`}
                            >
                              <Edit className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(promo)}
                              aria-label={`Delete promo ${promo.code}`}
                            >
                              <Trash2
                                className="h-4 w-4 text-destructive"
                                aria-hidden="true"
                              />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNextPage}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {promoPagination && (
        <DataTablePagination
          pagination={promoPagination}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
