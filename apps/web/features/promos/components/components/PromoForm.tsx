"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import {
  useProductsPaginated,
  useProducts,
  useCategories,
} from "@/features/products";
import type {
  PromoCode,
  CreateOrUpdatePromoData,
} from "../../hooks/use-promos";

interface PromoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPromo: PromoCode | null;
  onSubmit: (data: CreateOrUpdatePromoData) => Promise<void>;
  onReset: () => void;
  isLoading?: boolean;
  /** When true, render form only (no Dialog/trigger). For use on dedicated pages (e.g. mobile). */
  inline?: boolean;
  /** When false, do not render the Dialog trigger (parent opens dialog). Default true. */
  renderTrigger?: boolean;
}

const initialFormData: CreateOrUpdatePromoData = {
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
  applyToAll: false,
  categoryIds: [],
  subCategories: [],
};

export function PromoForm({
  open,
  onOpenChange,
  editingPromo,
  onSubmit,
  onReset,
  isLoading,
  inline = false,
  renderTrigger = true,
}: PromoFormProps) {
  const [formData, setFormData] =
    useState<CreateOrUpdatePromoData>(initialFormData);
  const [productSearch, setProductSearch] = useState("");

  const { data: productsResponse } = useProductsPaginated({
    page: 1,
    limit: 10,
  });
  const { data: allProducts = [] } = useProducts();
  const { data: categories = [] } = useCategories();

  const allSubcategories = useMemo(() => {
    const set = new Set<string>();
    (allProducts ?? []).forEach((p) => {
      if (p.subCategory) set.add(p.subCategory);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    const productsBase = productsResponse?.data ?? [];
    if (!productSearch.trim()) return productsBase;
    const term = productSearch.toLowerCase();
    return productsBase.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p as { imsCode?: string }).imsCode?.toLowerCase().includes(term),
    );
  }, [productsResponse, productSearch]);

  useEffect(() => {
    if (open && editingPromo) {
      setFormData({
        code: editingPromo.code,
        description: editingPromo.description || "",
        valueType: editingPromo.valueType,
        value: editingPromo.value,
        overrideDiscounts: editingPromo.overrideDiscounts,
        allowStacking: editingPromo.allowStacking,
        eligibility: editingPromo.eligibility,
        validFrom: editingPromo.validFrom || undefined,
        validTo: editingPromo.validTo || undefined,
        usageLimit: editingPromo.usageLimit ?? undefined,
        isActive: editingPromo.isActive,
        productIds: (editingPromo.products || []).map((p) => p.productId),
        applyToAll: false,
        categoryIds: [],
        subCategories: [],
      });
    } else if (!open) {
      setFormData(initialFormData);
      setProductSearch("");
    }
  }, [open, editingPromo]);

  const handleSubmit = async () => {
    await onSubmit(formData);
    onOpenChange(false);
    onReset();
  };

  const handleCancel = () => {
    onOpenChange(false);
    onReset();
  };

  const formContent = (
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
                eligibility: value as CreateOrUpdatePromoData["eligibility"],
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Customers</SelectItem>
              <SelectItem value="MEMBER">Members Only</SelectItem>
              <SelectItem value="NON_MEMBER">Non-Members Only</SelectItem>
              <SelectItem value="WHOLESALE">Wholesale Only</SelectItem>
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
          <label className="text-xs font-medium">Discount Type</label>
          <Select
            value={formData.valueType}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                valueType: value as CreateOrUpdatePromoData["valueType"],
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
              <SelectItem value="FLAT">Flat Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Value</label>
          <Input
            type="number"
            min={0}
            step={0.01}
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
          <label className="text-xs font-medium">Usage Limit (optional)</label>
          <Input
            type="number"
            min={0}
            value={formData.usageLimit ?? ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                usageLimit:
                  e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
            placeholder="Unlimited if empty"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Valid From (optional)</label>
          <Input
            type="date"
            value={formData.validFrom ? formData.validFrom.slice(0, 10) : ""}
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
          <label className="text-xs font-medium">Valid To (optional)</label>
          <Input
            type="date"
            value={formData.validTo ? formData.validTo.slice(0, 10) : ""}
            min={
              formData.validFrom ? formData.validFrom.slice(0, 10) : undefined
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
              setFormData((prev) => ({ ...prev, overrideDiscounts: checked }))
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
              setFormData((prev) => ({ ...prev, allowStacking: checked }))
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
              setFormData((prev) => ({ ...prev, isActive: checked }))
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
        <label className="text-xs font-medium">Products (apply to)</label>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Switch
                id="apply-all"
                checked={!!formData.applyToAll}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, applyToAll: checked }))
                }
              />
              <label
                htmlFor="apply-all"
                className="text-xs text-muted-foreground"
              >
                Apply to all products
              </label>
            </div>
            {!formData.applyToAll && (
              <Input
                placeholder="Search products..."
                className="h-8 w-40 text-xs"
                onChange={(e) => setProductSearch(e.target.value)}
              />
            )}
          </div>

          {!formData.applyToAll && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Filter by Category
                </label>
                <div className="flex flex-wrap gap-1">
                  {categories.map((cat) => {
                    const selected =
                      formData.categoryIds?.includes(cat.id) ?? false;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`px-2 py-0.5 rounded-full text-xs border ${
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                        onClick={() =>
                          setFormData((prev) => {
                            const current = prev.categoryIds || [];
                            const exists = current.includes(cat.id);
                            return {
                              ...prev,
                              categoryIds: exists
                                ? current.filter((id) => id !== cat.id)
                                : [...current, cat.id],
                            };
                          })
                        }
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Filter by Subcategory
                </label>
                <div className="flex flex-wrap gap-1">
                  {allSubcategories.map((sub) => {
                    const selected =
                      formData.subCategories?.includes(sub) ?? false;
                    return (
                      <button
                        key={sub}
                        type="button"
                        className={`px-2 py-0.5 rounded-full text-xs border ${
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                        onClick={() =>
                          setFormData((prev) => {
                            const current = prev.subCategories || [];
                            const exists = current.includes(sub);
                            return {
                              ...prev,
                              subCategories: exists
                                ? current.filter((s) => s !== sub)
                                : [...current, sub],
                            };
                          })
                        }
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {filteredProducts.map((product) => {
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
                          ({(product as { imsCode?: string }).imsCode ?? "—"})
                        </span>
                      </span>
                      {isSelected && (
                        <Badge variant="outline" className="text-xs px-2 py-0">
                          Selected
                        </Badge>
                      )}
                    </button>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No products available
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || !formData.code.trim()}
        >
          {isLoading
            ? "Saving..."
            : editingPromo
              ? "Update Promo"
              : "Create Promo"}
        </Button>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="max-w-xl space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">
            {editingPromo ? "Edit Promo Code" : "Create Promo Code"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {editingPromo
              ? "Update the promo code details below."
              : "Create a new promo code for products."}
          </p>
        </div>
        {formContent}
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onReset();
        onOpenChange(o);
      }}
    >
      {renderTrigger && (
        <DialogTrigger asChild>
          <Button
            className="gap-2"
            onClick={() => {
              setFormData(initialFormData);
              onReset();
            }}
          >
            <Plus className="h-4 w-4" />
            New Promo
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editingPromo ? "Edit Promo Code" : "Create Promo Code"}
          </DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
