"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import {
  useVendorsPaginated,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
  useVendor,
  useVendorProducts,
  type Vendor,
  type CreateOrUpdateVendorData,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "../hooks/use-vendors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SortableTableHead,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Plus, Search, Eye, X } from "lucide-react";
import { format } from "date-fns";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";
import { useIsMobile } from "@/hooks/useMobile";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useVendorSelectionStore,
  selectSelectedVendorIds,
  selectClearSelection,
  selectSetVendors,
} from "../store/vendor-selection-store";
import { VendorForm } from "./VendorForm";

export function VendorPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const debouncedProductSearch = useDebounce(productSearch, 300);
  const [productPage, setProductPage] = useState(DEFAULT_PAGE);
  const productLimit = 10;
  const [deleteBlockedVendor, setDeleteBlockedVendor] = useState<Vendor | null>(
    null,
  );
  const [deleteVendorToConfirm, setDeleteVendorToConfirm] =
    useState<Vendor | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(
    null,
  );
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const selectedVendorIds = useVendorSelectionStore(selectSelectedVendorIds);
  const setSelectedVendorIds = useVendorSelectionStore(selectSetVendors);
  const clearSelection = useVendorSelectionStore(selectClearSelection);

  const { data: vendorsResponse, isLoading } = useVendorsPaginated({
    page,
    limit: pageSize,
    search: debouncedSearch,
    sortBy,
    sortOrder,
  });

  const vendors = vendorsResponse?.data ?? [];
  const pagination = vendorsResponse?.pagination;

  const { data: activeVendor } = useVendor(activeVendorId || "");
  const { data: vendorProductsResponse, isLoading: vendorProductsLoading } =
    useVendorProducts(activeVendorId || "", {
      page: productPage,
      limit: productLimit,
      search: debouncedProductSearch,
    });
  const vendorProducts = vendorProductsResponse?.data ?? [];
  const vendorProductsPagination = vendorProductsResponse?.pagination;

  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();
  const deleteMutation = useDeleteVendor();

  const resetForm = () => {
    setEditingVendor(null);
  };

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(DEFAULT_PAGE);
    },
    [],
  );

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (vendor: Vendor) => {
    if (isMobile) {
      router.push(`${basePath}/vendors/${vendor.id}/edit`);
      return;
    }
    setEditingVendor(vendor);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: CreateOrUpdateVendorData) => {
    try {
      if (editingVendor) {
        await updateMutation.mutateAsync({
          id: editingVendor.id,
          data,
        });
        toast({
          title: "Vendor updated",
          description: `Vendor "${data.name}" has been updated.`,
        });
      } else {
        await createMutation.mutateAsync(data);
        toast({
          title: "Vendor created",
          description: `Vendor "${data.name}" has been created.`,
        });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save vendor",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (vendor: Vendor) => {
    const productCount = vendor._count?.products ?? 0;
    if (productCount > 0) {
      setDeleteBlockedVendor(vendor);
      return;
    }
    setDeleteVendorToConfirm(vendor);
  };

  const confirmDeleteVendor = async () => {
    const vendor = deleteVendorToConfirm;
    if (!vendor) return;
    try {
      await deleteMutation.mutateAsync(vendor.id);
      toast({
        title: "Vendor deleted",
        description: `Vendor "${vendor.name}" has been deleted.`,
      });
      setDeleteVendorToConfirm(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete vendor. Please try again.";
      setDeleteErrorMessage(message);
      toast({
        title: "Cannot delete vendor",
        description: message,
        variant: "destructive",
      });
      setDeleteVendorToConfirm(null);
    }
  };

  const handleBulkDeleteClick = () => setBulkDeleteOpen(true);

  const handleBulkDeleteConfirm = async () => {
    const ids = Array.from(selectedVendorIds);
    const vendorMap = new Map(vendors.map((v) => [v.id, v]));
    const toDelete = ids.filter(
      (id) => (vendorMap.get(id)?._count?.products ?? 0) === 0,
    );
    const skipped = ids.length - toDelete.length;
    let deleted = 0;
    for (const id of toDelete) {
      try {
        await deleteMutation.mutateAsync(id);
        deleted++;
      } catch {
        // toast per error or single toast at end
      }
    }
    if (deleted > 0) {
      toast({
        title: "Vendors deleted",
        description: `${deleted} vendor${deleted !== 1 ? "s" : ""} deleted${skipped > 0 ? `. ${skipped} skipped (have products).` : "."}`,
      });
    }
    if (skipped > 0 && deleted === 0) {
      toast({
        title: "Cannot delete",
        description:
          "Selected vendors have products. Reassign or remove products first.",
        variant: "destructive",
      });
    }
    setBulkDeleteOpen(false);
    clearSelection();
  };

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(DEFAULT_PAGE);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setPage(DEFAULT_PAGE);
  }, []);
  const hasActiveFilters = search !== "";

  const vendorPagination: PaginationState | null = pagination
    ? {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        totalItems: pagination.totalItems,
        itemsPerPage: pagination.itemsPerPage,
        hasNextPage: pagination.hasNextPage,
        hasPrevPage: pagination.hasPrevPage,
      }
    : null;

  const allVendorsSelected =
    vendors.length > 0 && vendors.every((v) => selectedVendorIds.has(v.id));
  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedVendorIds(new Set(vendors.map((v) => v.id)));
    else clearSelection();
  };
  const handleSelectVendor = (vendorId: string, checked: boolean) => {
    const next = new Set(selectedVendorIds);
    if (checked) next.add(vendorId);
    else next.delete(vendorId);
    setSelectedVendorIds(next);
  };
  const tableColumnCount = 8;

  const handleVendorColumnSort = useCallback(
    (by: string, order: "asc" | "desc" | "none") => {
      if (order === "none") {
        setSortBy("name");
        setSortOrder("asc");
      } else {
        setSortBy(by);
        setSortOrder(order);
      }
      setPage(DEFAULT_PAGE);
    },
    [],
  );

  return (
    <div className="space-y-6 pb-24">
      {/* Block delete when vendor has associated products */}
      <AlertDialog
        open={!!deleteBlockedVendor}
        onOpenChange={(open) => {
          if (!open) setDeleteBlockedVendor(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot delete vendor</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteBlockedVendor && (
                <>
                  This vendor is linked to{" "}
                  <strong>
                    {deleteBlockedVendor._count?.products ?? 0} product
                    {(deleteBlockedVendor._count?.products ?? 0) === 1
                      ? ""
                      : "s"}
                  </strong>
                  . Please reassign or remove those products first.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeleteBlockedVendor(null)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm delete vendor */}
      <AlertDialog
        open={!!deleteVendorToConfirm}
        onOpenChange={(open) => !open && setDeleteVendorToConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete vendor &quot;
              {deleteVendorToConfirm?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteVendor}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Show API error when delete is blocked (e.g. products associated) */}
      <AlertDialog
        open={!!deleteErrorMessage}
        onOpenChange={(open) => {
          if (!open) setDeleteErrorMessage(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cannot delete vendor</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteErrorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeleteErrorMessage(null)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageHeader
        title="Vendors"
        description="Manage product vendors and their contact information."
        actions={
          isMobile ? (
            <Button asChild>
              <Link href={`${basePath}/vendors/new`} className="gap-2">
                <Plus className="h-4 w-4" aria-hidden="true" />
                New Vendor
              </Link>
            </Button>
          ) : (
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New Vendor
            </Button>
          )
        }
      />

      {!isMobile && (
        <VendorForm
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) resetForm();
          }}
          editingVendor={editingVendor}
          onSubmit={handleSubmit}
          onReset={resetForm}
          isLoading={createMutation.isPending || updateMutation.isPending}
          renderTrigger={false}
        />
      )}

      {/* Vendor Products Dialog */}
      <Dialog
        open={productDialogOpen}
        onOpenChange={(open) => {
          setProductDialogOpen(open);
          if (!open) {
            setActiveVendorId(null);
            setProductSearch("");
            setProductPage(DEFAULT_PAGE);
          }
        }}
      >
        <DialogContent
          className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto"
          allowDismiss={false}
        >
          <DialogHeader>
            <DialogTitle>
              Products for {activeVendor?.name || "Vendor"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search
                className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Search products by name or product code..."
                className="pl-8"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setProductPage(DEFAULT_PAGE);
                }}
              />
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">MRP</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorProductsLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-6 text-muted-foreground"
                        role="status"
                        aria-live="polite"
                      >
                        Loading products…
                      </TableCell>
                    </TableRow>
                  ) : vendorProducts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-6 text-muted-foreground"
                      >
                        No products found for this vendor.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendorProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono">
                          {(
                            product as {
                              variations?: Array<{ imsCode?: string }>;
                            }
                          ).variations?.[0]?.imsCode ?? "—"}
                        </TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell className="text-right">
                          {product.mrp != null ? product.mrp : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.costPrice != null ? product.costPrice : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {vendorProductsPagination &&
              vendorProductsPagination.totalItems > 0 && (
                <DataTablePagination
                  pagination={{
                    currentPage: vendorProductsPagination.currentPage,
                    totalPages: vendorProductsPagination.totalPages,
                    totalItems: vendorProductsPagination.totalItems,
                    itemsPerPage: vendorProductsPagination.itemsPerPage,
                    hasNextPage: vendorProductsPagination.hasNextPage,
                    hasPrevPage: vendorProductsPagination.hasPrevPage,
                  }}
                  onPageChange={setProductPage}
                  isLoading={vendorProductsLoading}
                />
              )}
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg font-medium">Vendor List</CardTitle>
            <CardDescription>
              Search and manage all vendors in the system.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Search vendors..."
                className="pl-8 w-[220px]"
                value={search}
                onChange={handleSearchChange}
              />
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={clearAllFilters}
              >
                <X className="h-3.5 w-3.5 mr-2" aria-hidden="true" />
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allVendorsSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all vendors"
                    />
                  </TableHead>
                  <SortableTableHead
                    sortKey="name"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleVendorColumnSort}
                  >
                    Name
                  </SortableTableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-center">Products</TableHead>
                  <SortableTableHead
                    sortKey="createdAt"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleVendorColumnSort}
                  >
                    Created
                  </SortableTableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={tableColumnCount}
                      className="text-center py-8"
                      role="status"
                      aria-live="polite"
                    >
                      Loading vendors...
                    </TableCell>
                  </TableRow>
                ) : vendors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={tableColumnCount}
                      className="text-center py-10"
                    >
                      {hasActiveFilters ? (
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-sm font-medium">
                            No vendors match your search
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Try a different search term.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={clearAllFilters}
                          >
                            Clear search
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <p className="text-sm font-medium">No vendors yet</p>
                          <p className="text-sm text-muted-foreground">
                            Add a vendor to get started.
                          </p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="w-12">
                        <Checkbox
                          checked={selectedVendorIds.has(vendor.id)}
                          onCheckedChange={(checked) =>
                            handleSelectVendor(vendor.id, checked === true)
                          }
                          aria-label={`Select ${vendor.name}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => {
                            setActiveVendorId(vendor.id);
                            setProductDialogOpen(true);
                          }}
                        >
                          {vendor.name}
                        </button>
                      </TableCell>
                      <TableCell>
                        {vendor.contact ? (
                          vendor.contact
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vendor.phone ? (
                          vendor.phone
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">
                        {vendor.address ? (
                          vendor.address
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {vendor._count?.products ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {format(new Date(vendor.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setActiveVendorId(vendor.id);
                              setProductDialogOpen(true);
                            }}
                            aria-label={`View products for ${vendor.name}`}
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(vendor)}
                            aria-label={`Edit ${vendor.name}`}
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(vendor)}
                            aria-label={`Delete ${vendor.name}`}
                          >
                            <Trash2
                              className="h-4 w-4 text-destructive"
                              aria-hidden="true"
                            />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {vendorPagination && (
            <DataTablePagination
              pagination={vendorPagination}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected vendors?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedVendorIds.size} vendor
              {selectedVendorIds.size !== 1 ? "s" : ""}. Vendors with linked
              products will be skipped. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sticky bulk action bar */}
      {selectedVendorIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 py-3 px-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <span className="text-sm font-medium">
              {selectedVendorIds.size} item
              {selectedVendorIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDeleteClick}
              >
                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={clearSelection}
                className="shrink-0"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
