"use client";

import { useState, useCallback } from "react";
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
} from "@/hooks/usePromos";
import { useProductsPaginated } from "@/hooks/useProduct";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Trash2, Edit, Plus, Search } from "lucide-react";

export function PromoPage() {
  const { toast } = useToast();

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [search, setSearch] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);

  const { data: promosResponse, isLoading } = usePromosPaginated({
    page,
    limit: DEFAULT_LIMIT,
    search,
    isActive: showActiveOnly ? true : undefined,
  });

  const promos = promosResponse?.data ?? [];
  const pagination = promosResponse?.pagination;

  const { data: productsResponse } = useProductsPaginated({
    page: 1,
    limit: 200,
  });
  const products = productsResponse?.data ?? [];

  const createMutation = useCreatePromo();
  const updateMutation = useUpdatePromo();
  const deleteMutation = useDeletePromo();

  const [formData, setFormData] = useState<CreateOrUpdatePromoData>({
    code: "",
    description: "",
    valueType: "PERCENTAGE",
    value: 10,
    overrideDiscounts: false,
    allowStacking: false,
    eligibility: "ALL",
    validFrom: undefined,
    validTo: undefined,
    usageLimit: undefined,
    isActive: true,
    productIds: [],
  });

  const resetForm = () => {
    setEditingPromo(null);
    setFormData({
      code: "",
      description: "",
      valueType: "PERCENTAGE",
      value: 10,
      overrideDiscounts: false,
      allowStacking: false,
      eligibility: "ALL",
      validFrom: undefined,
      validTo: undefined,
      usageLimit: undefined,
      isActive: true,
      productIds: [],
    });
  };

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(DEFAULT_PAGE);
    },
    [],
  );

  const handleEdit = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      description: promo.description || "",
      valueType: promo.valueType,
      value: promo.value,
      overrideDiscounts: promo.overrideDiscounts,
      allowStacking: promo.allowStacking,
      eligibility: promo.eligibility,
      validFrom: promo.validFrom || undefined,
      validTo: promo.validTo || undefined,
      usageLimit: promo.usageLimit ?? undefined,
      isActive: promo.isActive,
      productIds: (promo.products || []).map((p) => p.productId),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingPromo) {
        await updateMutation.mutateAsync({
          id: editingPromo.id,
          data: formData,
        });
        toast({ title: "Promo code updated successfully" });
      } else {
        await createMutation.mutateAsync(formData);
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  resetForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  className="gap-2"
                  onClick={() => {
                    resetForm();
                  }}
                >
                  <Plus className="h-4 w-4" />
                  New Promo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingPromo ? "Edit Promo Code" : "Create Promo Code"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Code *</label>
                      <Input
                        value={formData.code}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            code: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="e.g. FESTIVE20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Eligibility</label>
                      <Select
                        value={formData.eligibility}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            eligibility:
                              value as CreateOrUpdatePromoData["eligibility"],
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Customers</SelectItem>
                          <SelectItem value="MEMBER">Members Only</SelectItem>
                          <SelectItem value="NON_MEMBER">
                            Non-Members Only
                          </SelectItem>
                          <SelectItem value="WHOLESALE">
                            Wholesale Only
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium">Description</label>
                    <Input
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Short description for internal use"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">
                        Discount Type
                      </label>
                      <Select
                        value={formData.valueType}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            valueType:
                              value as CreateOrUpdatePromoData["valueType"],
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERCENTAGE">
                            Percentage (%)
                          </SelectItem>
                          <SelectItem value="FLAT">Flat Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Value</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.value}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            value: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">
                        Usage Limit (optional)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.usageLimit ?? ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            usageLimit:
                              e.target.value === ""
                                ? undefined
                                : Number(e.target.value),
                          }))
                        }
                        placeholder="Unlimited if empty"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">
                        Valid From (optional)
                      </label>
                      <Input
                        type="date"
                        value={
                          formData.validFrom
                            ? formData.validFrom.slice(0, 10)
                            : ""
                        }
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            validFrom:
                              e.target.value || formData.validTo
                                ? e.target.value
                                : undefined,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium">
                        Valid To (optional)
                      </label>
                      <Input
                        type="date"
                        value={
                          formData.validTo ? formData.validTo.slice(0, 10) : ""
                        }
                        min={
                          formData.validFrom
                            ? formData.validFrom.slice(0, 10)
                            : undefined
                        }
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            validTo:
                              e.target.value || formData.validFrom
                                ? e.target.value
                                : undefined,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="override-discounts"
                        checked={!!formData.overrideDiscounts}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            overrideDiscounts: checked,
                          }))
                        }
                      />
                      <label
                        htmlFor="override-discounts"
                        className="text-xs text-muted-foreground"
                      >
                        Override existing discounts
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="allow-stacking"
                        checked={!!formData.allowStacking}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            allowStacking: checked,
                          }))
                        }
                      />
                      <label
                        htmlFor="allow-stacking"
                        className="text-xs text-muted-foreground"
                      >
                        Allow stacking with discounts
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="promo-active"
                        checked={!!formData.isActive}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            isActive: checked,
                          }))
                        }
                      />
                      <label
                        htmlFor="promo-active"
                        className="text-xs text-muted-foreground"
                      >
                        Active
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium">
                      Products (apply to)
                    </label>
                    <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                      {products.map((product) => {
                        const isSelected =
                          formData.productIds?.includes(product.id) ?? false;
                        return (
                          <button
                            key={product.id}
                            type="button"
                            className={`w-full flex items-center justify-between px-2 py-1 text-sm rounded hover:bg-muted ${
                              isSelected ? "bg-muted" : ""
                            }`}
                            onClick={() => {
                              setFormData((prev) => {
                                const current = prev.productIds || [];
                                const exists = current.includes(product.id);
                                return {
                                  ...prev,
                                  productIds: exists
                                    ? current.filter((id) => id !== product.id)
                                    : [...current, product.id],
                                };
                              });
                            }}
                          >
                            <span className="truncate">
                              {product.name}{" "}
                              <span className="text-xs text-muted-foreground">
                                ({product.imsCode})
                              </span>
                            </span>
                            {isSelected && (
                              <Badge
                                variant="outline"
                                className="text-xs px-2 py-0"
                              >
                                Selected
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                      {products.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No products available
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSaving || !formData.code.trim()}
                    >
                      {isSaving
                        ? "Saving..."
                        : editingPromo
                          ? "Update Promo"
                          : "Create Promo"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Eligibility</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      Loading promo codes...
                    </TableCell>
                  </TableRow>
                ) : promos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
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
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(promo)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(promo)}
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
    </div>
  );
}
