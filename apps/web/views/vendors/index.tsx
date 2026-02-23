"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  type VendorListParams,
  type PaginatedVendorsResponse,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/hooks/useVendors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
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
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Plus, Search, Eye, X } from "lucide-react";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";
import { VendorForm } from "./components/VendorForm";

export interface VendorsPageClientProps {
  initialData?: PaginatedVendorsResponse;
  initialParams?: VendorListParams;
}

export function VendorsPageClient({
  initialData,
  initialParams,
}: VendorsPageClientProps = {}) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();

  const [page, setPage] = useState(initialParams?.page ?? DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(
    initialParams?.limit ?? DEFAULT_LIMIT,
  );
  const [search, setSearch] = useState(initialParams?.search ?? "");
  const [sortBy, setSortBy] = useState<string>(initialParams?.sortBy ?? "name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    initialParams?.sortOrder ?? "asc",
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(DEFAULT_PAGE);
  const productLimit = 10;
  const [deleteBlockedVendor, setDeleteBlockedVendor] = useState<Vendor | null>(
    null,
  );

  const { data: vendorsResponse, isLoading } = useVendorsPaginated(
    {
      page,
      limit: pageSize,
      search,
      sortBy,
      sortOrder,
    },
    { initialData },
  );

  const vendors = useMemo(() => vendorsResponse?.data ?? [], [vendorsResponse]);
  const pagination = vendorsResponse?.pagination;

  const { data: activeVendor } = useVendor(activeVendorId || "");
  const { data: vendorProductsResponse, isLoading: vendorProductsLoading } =
    useVendorProducts(activeVendorId || "", {
      page: productPage,
      limit: productLimit,
      search: productSearch,
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
    const isNarrowScreen =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches;
    if (isNarrowScreen) {
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

  const handleDelete = async (vendor: Vendor) => {
    const productCount = vendor._count?.products ?? 0;
    if (productCount > 0) {
      setDeleteBlockedVendor(vendor);
      return;
    }
    if (!confirm(`Are you sure you want to delete vendor "${vendor.name}"?`)) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(vendor.id);
      toast({
        title: "Vendor deleted",
        description: `Vendor "${vendor.name}" has been deleted.`,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete vendor. Please try again.";
      toast({
        title: "Cannot delete vendor",
        description: message,
        variant: "destructive",
      });
    }
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

  useEffect(() => {
    const isNarrowScreen =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches;
    if (isNarrowScreen) return;
    const add = searchParams.get("add");
    const edit = searchParams.get("edit");
    if (add === "1") {
      resetForm();
      setDialogOpen(true);
      return;
    }
    if (edit) {
      const vendor = vendors.find((v) => v.id === edit);
      if (vendor) {
        setEditingVendor(vendor);
        setDialogOpen(true);
      }
    }
  }, [searchParams, vendors]);

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

  return (
    <div className="space-y-6">
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">
            Manage product vendors and their contact information.
          </p>
        </div>

        <Button asChild className="md:hidden">
          <Link href={`${basePath}/vendors/new`} className="gap-2">
            <Plus className="h-4 w-4" />
            New Vendor
          </Link>
        </Button>
        <div className="hidden md:block">
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Vendor
          </Button>
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
        </div>
      </div>

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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Products for {activeVendor?.name || "Vendor"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or IMS code..."
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
                    <TableHead>IMS Code</TableHead>
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
                          {product.imsCode}
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
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                className="w-full pl-8 sm:w-[220px]"
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
                <X className="h-3.5 w-3.5 mr-2" />
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
                  <SortableTableHead
                    sortKey="name"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={(by, order) => {
                      setSortBy(by);
                      setSortOrder(order);
                      setPage(DEFAULT_PAGE);
                    }}
                  >
                    Name
                  </SortableTableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-center">Products</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading vendors...
                    </TableCell>
                  </TableRow>
                ) : vendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No vendors found.
                    </TableCell>
                  </TableRow>
                ) : (
                  vendors.map((vendor) => (
                    <TableRow key={vendor.id}>
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setActiveVendorId(vendor.id);
                              setProductDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(vendor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(vendor)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
    </div>
  );
}

/** Re-export for backward compatibility. */
export function VendorPage(props: VendorsPageClientProps) {
  return <VendorsPageClient {...props} />;
}
