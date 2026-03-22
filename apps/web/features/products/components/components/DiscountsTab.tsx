"use client";

/**
 * Product discounts list page content (table, filters, pagination).
 * Full CRUD for product discounts - Add, Edit, Delete.
 * Not the form tab – see form-tabs/DiscountsTab.tsx for product form discount rows (view-only).
 */

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useProductDiscountsList,
  useCategories,
  useDiscountTypes,
  useProductsPaginated,
  useUpdateProduct,
  getProductById,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  type ProductDiscountListItem,
  type ProductDiscountListParams,
} from "@/features/products";
import { formatCurrency } from "@/lib/format";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useToast } from "@/hooks/useToast";
import { useDebounce } from "@/hooks/useDebounce";
import { Search, Loader2, Filter, Plus, Pencil, Trash2 } from "lucide-react";

type DiscountFormData = {
  productId: string;
  discountTypeId: string;
  discountPercentage: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const emptyForm: DiscountFormData = {
  productId: "",
  discountTypeId: "",
  discountPercentage: "0",
  startDate: "",
  endDate: "",
  isActive: true,
};

function toUpdateDiscounts(
  discounts: Array<{
    id?: string;
    discountTypeId: string;
    discountPercentage: number;
    startDate?: string | null;
    endDate?: string | null;
    isActive: boolean;
  }>,
) {
  return discounts.map((d) => ({
    discountTypeId: d.discountTypeId,
    discountPercentage: Number(d.discountPercentage) || 0,
    startDate:
      d.startDate && String(d.startDate).trim() !== ""
        ? String(d.startDate).split("T")[0]
        : undefined,
    endDate:
      d.endDate && String(d.endDate).trim() !== ""
        ? String(d.endDate).split("T")[0]
        : undefined,
    isActive: d.isActive,
  }));
}

export function DiscountsTab() {
  const { toast } = useToast();
  const updateProductMutation = useUpdateProduct();

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [params, setParams] = useState<ProductDiscountListParams>({
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    search: "",
    productId: undefined,
    categoryId: undefined,
    subCategoryId: undefined,
    discountTypeId: undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editState, setEditState] = useState<{
    open: boolean;
    discount: ProductDiscountListItem | null;
  }>({ open: false, discount: null });
  const [deleteState, setDeleteState] = useState<{
    open: boolean;
    discount: ProductDiscountListItem | null;
  }>({ open: false, discount: null });
  const [bulkDeleteState, setBulkDeleteState] = useState(false);
  const [selectedDiscounts, setSelectedDiscounts] = useState<
    Map<string, ProductDiscountListItem>
  >(new Map());
  const [formData, setFormData] = useState<DiscountFormData>(emptyForm);

  const selectedDiscountIds = new Set(selectedDiscounts.keys());

  const toggleDiscount = (discount: ProductDiscountListItem) => {
    setSelectedDiscounts((prev) => {
      const next = new Map(prev);
      if (next.has(discount.id)) next.delete(discount.id);
      else next.set(discount.id, discount);
      return next;
    });
  };

  const clearSelection = () => setSelectedDiscounts(new Map());

  const { data, isLoading } = useProductDiscountsList({
    ...params,
    search: debouncedSearch || undefined,
  });
  const { data: categories = [] } = useCategories();
  const { data: discountTypes = [] } = useDiscountTypes();
  const { data: productsResponse } = useProductsPaginated({
    page: 1,
    limit: 10,
  });
  const products = productsResponse?.data ?? [];

  const discounts = data?.data ?? [];
  const pagination = data?.pagination;

  const toggleAllOnPage = (checked: boolean) => {
    setSelectedDiscounts((prev) => {
      const next = new Map(prev);
      if (checked) {
        for (const d of discounts) next.set(d.id, d);
      } else {
        for (const d of discounts) next.delete(d.id);
      }
      return next;
    });
  };

  const allOnPageSelected =
    discounts.length > 0 &&
    discounts.every((d) => selectedDiscountIds.has(d.id));
  const someOnPageSelected = discounts.some((d) =>
    selectedDiscountIds.has(d.id),
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setParams((prev) => ({ ...prev, page: DEFAULT_PAGE }));
  }, []);

  const handleFilterChange = useCallback(
    (key: keyof ProductDiscountListParams, value: string | undefined) => {
      setParams((prev: ProductDiscountListParams) => ({
        ...prev,
        page: DEFAULT_PAGE,
        [key]: value === "all" || !value ? undefined : value,
      }));
    },
    [],
  );

  const handleSortChange = useCallback(
    (sortBy: string, sortOrder: "asc" | "desc") => {
      setParams((prev: ProductDiscountListParams) => ({
        ...prev,
        page: DEFAULT_PAGE,
        sortBy,
        sortOrder,
      }));
    },
    [],
  );

  const handlePageChange = useCallback((page: number) => {
    setParams((prev: ProductDiscountListParams) => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setParams((prev: ProductDiscountListParams) => ({
      ...prev,
      page: DEFAULT_PAGE,
      limit: pageSize,
    }));
  }, []);

  const openAddDialog = () => {
    setFormData(emptyForm);
    setAddDialogOpen(true);
  };

  const openEditDialog = (discount: ProductDiscountListItem) => {
    setEditState({ open: true, discount });
    setFormData({
      productId: discount.productId,
      discountTypeId: discount.discountTypeId,
      discountPercentage: String(discount.discountPercentage),
      startDate: discount.startDate
        ? (new Date(discount.startDate).toISOString().split("T")[0] ?? "")
        : "",
      endDate: discount.endDate
        ? (new Date(discount.endDate).toISOString().split("T")[0] ?? "")
        : "",
      isActive: discount.isActive,
    });
  };

  const openDeleteDialog = (discount: ProductDiscountListItem) => {
    setDeleteState({ open: true, discount });
  };

  const handleAddSubmit = async () => {
    if (!formData.productId || !formData.discountTypeId) {
      toast({
        title: "Validation error",
        description: "Product and discount type are required",
        variant: "destructive",
      });
      return;
    }
    const pct = Number(formData.discountPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast({
        title: "Validation error",
        description: "Discount percentage must be between 0 and 100",
        variant: "destructive",
      });
      return;
    }
    try {
      const product = await getProductById(formData.productId);
      const existing = product.discounts ?? [];
      const newDiscount = {
        discountTypeId: formData.discountTypeId,
        discountPercentage: pct,
        startDate:
          formData.startDate.trim() !== "" ? formData.startDate : undefined,
        endDate: formData.endDate.trim() !== "" ? formData.endDate : undefined,
        isActive: formData.isActive,
      };
      const duplicate = existing.some(
        (d) => d.discountTypeId === formData.discountTypeId,
      );
      if (duplicate) {
        toast({
          title: "Duplicate discount",
          description:
            "This product already has a discount of this type. Edit or remove it first.",
          variant: "destructive",
        });
        return;
      }
      const updatedDiscounts = toUpdateDiscounts([
        ...existing.map((d) => ({
          discountTypeId: d.discountTypeId,
          discountPercentage: d.discountPercentage,
          startDate: d.startDate,
          endDate: d.endDate,
          isActive: d.isActive,
        })),
        newDiscount,
      ]);
      await updateProductMutation.mutateAsync({
        id: formData.productId,
        data: { discounts: updatedDiscounts },
      });
      toast({ title: "Discount added" });
      setAddDialogOpen(false);
      setFormData(emptyForm);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to add discount";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleEditSubmit = async () => {
    const discount = editState.discount;
    if (!discount || !formData.discountTypeId) return;
    const pct = Number(formData.discountPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast({
        title: "Validation error",
        description: "Discount percentage must be between 0 and 100",
        variant: "destructive",
      });
      return;
    }
    try {
      const product = await getProductById(discount.productId);
      const existing = product.discounts ?? [];
      const updated = existing.map((d) => {
        if (d.id === discount.id) {
          return {
            ...d,
            discountTypeId: formData.discountTypeId,
            discountPercentage: pct,
            startDate:
              formData.startDate.trim() !== "" ? formData.startDate : undefined,
            endDate:
              formData.endDate.trim() !== "" ? formData.endDate : undefined,
            isActive: formData.isActive,
          };
        }
        return d;
      });
      await updateProductMutation.mutateAsync({
        id: discount.productId,
        data: { discounts: toUpdateDiscounts(updated) },
      });
      toast({ title: "Discount updated" });
      setEditState({ open: false, discount: null });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to update discount";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleDeleteConfirm = async () => {
    const discount = deleteState.discount;
    if (!discount) return;
    try {
      const product = await getProductById(discount.productId);
      const existing = product.discounts ?? [];
      const filtered = existing
        .filter((d) => d.id !== discount.id)
        .map((d) => ({
          discountTypeId: d.discountTypeId,
          discountPercentage: d.discountPercentage,
          startDate: d.startDate,
          endDate: d.endDate,
          isActive: d.isActive,
        }));
      await updateProductMutation.mutateAsync({
        id: discount.productId,
        data: { discounts: toUpdateDiscounts(filtered) },
      });
      toast({ title: "Discount removed" });
      setDeleteState({ open: false, discount: null });
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to remove discount";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleBulkDeleteConfirm = async () => {
    const toDelete = [...selectedDiscounts.values()];
    if (toDelete.length === 0) {
      setBulkDeleteState(false);
      clearSelection();
      return;
    }
    const byProduct = new Map<string, ProductDiscountListItem[]>();
    for (const d of toDelete) {
      const arr = byProduct.get(d.productId) ?? [];
      arr.push(d);
      byProduct.set(d.productId, arr);
    }
    try {
      for (const [productId, discountList] of byProduct) {
        const product = await getProductById(productId);
        const existing = product.discounts ?? [];
        const idsToRemove = new Set(discountList.map((d) => d.id));
        const filtered = existing
          .filter((d) => !idsToRemove.has(d.id))
          .map((d) => ({
            discountTypeId: d.discountTypeId,
            discountPercentage: d.discountPercentage,
            startDate: d.startDate,
            endDate: d.endDate,
            isActive: d.isActive,
          }));
        await updateProductMutation.mutateAsync({
          id: productId,
          data: { discounts: toUpdateDiscounts(filtered) },
        });
      }
      toast({
        title: `${toDelete.length} discount${toDelete.length !== 1 ? "s" : ""} removed`,
      });
      setBulkDeleteState(false);
      clearSelection();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Failed to remove discounts";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const formatValue = (d: ProductDiscountListItem) => {
    if (d.valueType === "PERCENTAGE") {
      return `${Number(d.value)}%`;
    }
    return formatCurrency(Number(d.value));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">All Discounts</h2>
          <p className="text-sm text-muted-foreground">
            Add, edit, or remove product discounts. Discount types are managed
            above.
          </p>
        </div>
        <Button onClick={openAddDialog} size="sm" className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          Add Product Discount
        </Button>
      </div>

      {selectedDiscountIds.size > 0 && (
        <div className="flex items-center gap-2 py-2 px-3 rounded-md border bg-muted/50">
          <span className="text-sm">
            {selectedDiscountIds.size} discount
            {selectedDiscountIds.size !== 1 ? "s" : ""} selected
          </span>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setBulkDeleteState(true)}
            disabled={updateProductMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete selected
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      )}

      {/* Minimal filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
        <div className="relative flex-1 min-w-[180px] max-w-[280px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search product or type..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-sm">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                Filter by
              </p>
              <div className="grid gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Product</Label>
                  <SearchableSelect
                    options={products.map((p) => ({
                      value: p.id,
                      label: `${p.name} (${(p as { imsCode?: string }).imsCode ?? "—"})`,
                    }))}
                    value={params.productId ?? "all"}
                    onChange={(v) => handleFilterChange("productId", v)}
                    placeholder="Select product"
                    includeAll
                    allLabel="All Products"
                    allValue="all"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <SearchableSelect
                    options={categories.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    value={params.categoryId ?? "all"}
                    onChange={(v) => handleFilterChange("categoryId", v)}
                    placeholder="Select category"
                    includeAll
                    allLabel="All Categories"
                    allValue="all"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Discount type</Label>
                  <SearchableSelect
                    options={discountTypes.map((dt) => ({
                      value: dt.id,
                      label: dt.name,
                    }))}
                    value={params.discountTypeId ?? "all"}
                    onChange={(v) => handleFilterChange("discountTypeId", v)}
                    placeholder="Select discount type"
                    includeAll
                    allLabel="All Types"
                    allValue="all"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sort</Label>
                  <Select
                    value={`${params.sortBy ?? "createdAt"}_${params.sortOrder ?? "desc"}`}
                    onValueChange={(v) => {
                      const i = v.lastIndexOf("_");
                      const sortBy = i === -1 ? v : v.slice(0, i);
                      const sortOrder = (i === -1 ? "desc" : v.slice(i + 1)) as
                        | "asc"
                        | "desc";
                      handleSortChange(sortBy, sortOrder);
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt_desc">
                        Newest first
                      </SelectItem>
                      <SelectItem value="createdAt_asc">
                        Oldest first
                      </SelectItem>
                      <SelectItem value="productName_asc">
                        Product A–Z
                      </SelectItem>
                      <SelectItem value="productName_desc">
                        Product Z–A
                      </SelectItem>
                      <SelectItem value="discountTypeName_asc">
                        Type A–Z
                      </SelectItem>
                      <SelectItem value="discountTypeName_desc">
                        Type Z–A
                      </SelectItem>
                      <SelectItem value="value_desc">Value high–low</SelectItem>
                      <SelectItem value="value_asc">Value low–high</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Discounts</CardTitle>
          <CardDescription>
            {pagination ? `${pagination.totalItems} discount(s)` : "Loading…"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={
                          allOnPageSelected
                            ? true
                            : someOnPageSelected
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(v) => toggleAllOnPage(v === true)}
                        aria-label="Select all on page"
                      />
                    </TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Subcategory</TableHead>
                    <TableHead>Discount Type</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discounts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="text-center text-muted-foreground py-8"
                      >
                        No discounts found. Add one above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    discounts.map((discount) => (
                      <TableRow key={discount.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedDiscountIds.has(discount.id)}
                            onCheckedChange={() => toggleDiscount(discount)}
                            aria-label={`Select ${discount.discountType?.name ?? "discount"} for ${discount.product.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {discount.product.name}
                          <span className="text-muted-foreground text-xs block">
                            {(discount.product as { imsCode?: string })
                              .imsCode ?? discount.product.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          {discount.product.category?.name ?? "-"}
                        </TableCell>
                        <TableCell>
                          {discount.product.subCategory ?? "-"}
                        </TableCell>
                        <TableCell>
                          {discount.discountType?.name ?? "Unknown"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatValue(discount)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              discount.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {discount.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {discount.startDate
                            ? new Date(discount.startDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {discount.endDate
                            ? new Date(discount.endDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(discount)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(discount)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {pagination && (
                <DataTablePagination
                  pagination={{
                    currentPage: pagination.currentPage,
                    totalPages: pagination.totalPages,
                    totalItems: pagination.totalItems,
                    itemsPerPage: pagination.itemsPerPage,
                    hasNextPage: pagination.hasNextPage,
                    hasPrevPage: pagination.hasPrevPage,
                  }}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent allowDismiss={false}>
          <DialogHeader>
            <DialogTitle>Add Product Discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select
                value={formData.productId}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, productId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({(p as { imsCode?: string }).imsCode ?? "—"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={formData.discountTypeId}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, discountTypeId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {discountTypes.map((dt) => (
                    <SelectItem key={dt.id} value={dt.id}>
                      {dt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Discount % (0–100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={formData.discountPercentage}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    discountPercentage: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date (optional)</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Date (optional)</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  min={formData.startDate || undefined}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="add-active"
                checked={formData.isActive}
                onCheckedChange={(v) =>
                  setFormData((prev) => ({ ...prev, isActive: v }))
                }
              />
              <Label htmlFor="add-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSubmit}
              disabled={
                updateProductMutation.isPending ||
                !formData.productId ||
                !formData.discountTypeId
              }
            >
              {updateProductMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={editState.open}
        onOpenChange={(open) =>
          !open && setEditState({ open: false, discount: null })
        }
      >
        <DialogContent allowDismiss={false}>
          <DialogHeader>
            <DialogTitle>Edit Product Discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <p className="text-sm font-medium">
                {editState.discount?.product.name ?? "-"}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={formData.discountTypeId}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, discountTypeId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {discountTypes.map((dt) => (
                    <SelectItem key={dt.id} value={dt.id}>
                      {dt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Discount % (0–100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={formData.discountPercentage}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    discountPercentage: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date (optional)</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Date (optional)</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  min={formData.startDate || undefined}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-active"
                checked={formData.isActive}
                onCheckedChange={(v) =>
                  setFormData((prev) => ({ ...prev, isActive: v }))
                }
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditState({ open: false, discount: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={
                updateProductMutation.isPending || !formData.discountTypeId
              }
            >
              {updateProductMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={deleteState.open}
        onOpenChange={(open) =>
          !open && setDeleteState({ open: false, discount: null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this discount?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the{" "}
              {deleteState.discount?.discountType?.name ?? "discount"} from{" "}
              {deleteState.discount?.product.name ?? "this product"}. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={updateProductMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updateProductMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirm */}
      <AlertDialog open={bulkDeleteState} onOpenChange={setBulkDeleteState}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove selected discounts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {selectedDiscountIds.size} discount
              {selectedDiscountIds.size !== 1 ? "s" : ""} from their products.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              disabled={updateProductMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updateProductMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete selected"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
