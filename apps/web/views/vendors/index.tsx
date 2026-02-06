"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import {
  useVendorsPaginated,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
  useVendor,
  type Vendor,
  type VendorProduct,
  type CreateOrUpdateVendorData,
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
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Plus, Search, Eye } from "lucide-react";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";
import { useIsMobile } from "@/hooks/useMobile";
import { VendorForm } from "./components/VendorForm";

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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");

  const { data: vendorsResponse, isLoading } = useVendorsPaginated({
    page,
    limit: pageSize,
    search,
  });

  const vendors = vendorsResponse?.data ?? [];
  const pagination = vendorsResponse?.pagination;

  const { data: activeVendor } = useVendor(activeVendorId || "");
  const filteredProducts: VendorProduct[] = useMemo(() => {
    if (!activeVendor?.products) return [];
    const term = productSearch.trim().toLowerCase();
    if (!term) return activeVendor.products;
    return activeVendor.products.filter((p) => {
      const name = p.name.toLowerCase();
      const code = p.imsCode.toLowerCase();
      return name.includes(term) || code.includes(term);
    });
  }, [activeVendor, productSearch]);

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

  const handleDelete = async (vendor: Vendor) => {
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
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete vendor. Make sure it has no products.",
        variant: "destructive",
      });
    }
  };

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(DEFAULT_PAGE);
  }, []);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">
            Manage product vendors and their contact information.
          </p>
        </div>

        {isMobile ? (
          <Button asChild>
            <Link href={`${basePath}/vendors/new`} className="gap-2">
              <Plus className="h-4 w-4" />
              New Vendor
            </Link>
          </Button>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Vendor Products Dialog */}
      <Dialog
        open={productDialogOpen}
        onOpenChange={(open) => {
          setProductDialogOpen(open);
          if (!open) {
            setActiveVendorId(null);
            setProductSearch("");
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
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or IMS code..."
                className="pl-8"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
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
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-6 text-muted-foreground"
                      >
                        No products found for this vendor.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
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
                className="pl-8 w-[220px]"
                value={search}
                onChange={handleSearchChange}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
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
