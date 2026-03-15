"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { PromoFormSchema, type PromoFormInput } from "../../validation";

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

const defaultValues: PromoFormInput = {
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
  const [productSearch, setProductSearch] = useState("");

  const form = useForm<PromoFormInput>({
    resolver: zodResolver(PromoFormSchema),
    mode: "onBlur",
    defaultValues,
  });

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
      form.reset({
        code: editingPromo.code,
        description: editingPromo.description || "",
        valueType: editingPromo.valueType,
        value: editingPromo.value,
        overrideDiscounts: editingPromo.overrideDiscounts,
        allowStacking: editingPromo.allowStacking,
        eligibility: editingPromo.eligibility,
        validFrom: editingPromo.validFrom
          ? editingPromo.validFrom.slice(0, 10)
          : undefined,
        validTo: editingPromo.validTo
          ? editingPromo.validTo.slice(0, 10)
          : undefined,
        usageLimit: editingPromo.usageLimit ?? undefined,
        isActive: editingPromo.isActive,
        productIds: (editingPromo.products || []).map((p) => p.productId),
        applyToAll: false,
        categoryIds: [],
        subCategories: [],
      });
    } else if (!open) {
      form.reset(defaultValues);
      setProductSearch("");
    }
  }, [open, editingPromo, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      code: values.code,
      description: values.description || undefined,
      valueType: values.valueType,
      value: values.value,
      overrideDiscounts: values.overrideDiscounts,
      allowStacking: values.allowStacking,
      eligibility: values.eligibility,
      validFrom: values.validFrom
        ? `${values.validFrom}T00:00:00.000Z`
        : undefined,
      validTo: values.validTo ? `${values.validTo}T23:59:59.999Z` : undefined,
      usageLimit: values.usageLimit ?? undefined,
      isActive: values.isActive,
      productIds: values.productIds,
      applyToAll: values.applyToAll,
      categoryIds: values.categoryIds,
      subCategories: values.subCategories,
    });
    onOpenChange(false);
    onReset();
  });

  const handleCancel = () => {
    onOpenChange(false);
    onReset();
  };

  const productIds = form.watch("productIds") ?? [];
  const categoryIds = form.watch("categoryIds") ?? [];
  const subCategories = form.watch("subCategories") ?? [];
  const applyToAll = form.watch("applyToAll");

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Code *</label>
          <Controller
            name="code"
            control={form.control}
            render={({ field }) => (
              <Input
                {...field}
                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                placeholder="e.g. FESTIVE20"
              />
            )}
          />
          {form.formState.errors.code && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.code.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Eligibility</label>
          <Controller
            name="eligibility"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) =>
                  field.onChange(value as PromoFormInput["eligibility"])
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
            )}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium">Description</label>
        <Input
          {...form.register("description")}
          placeholder="Short description for internal use"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Discount Type</label>
          <Controller
            name="valueType"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) =>
                  field.onChange(value as "PERCENTAGE" | "FLAT")
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
            )}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Value</label>
          <Input
            type="number"
            min={0}
            step={0.01}
            {...form.register("value", { valueAsNumber: true })}
          />
          {form.formState.errors.value && (
            <p className="text-sm text-destructive mt-1">
              {form.formState.errors.value.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Usage Limit (optional)</label>
          <Controller
            name="usageLimit"
            control={form.control}
            render={({ field }) => (
              <Input
                type="number"
                min={0}
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
                placeholder="Unlimited if empty"
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Valid From (optional)</label>
          <Controller
            name="validFrom"
            control={form.control}
            render={({ field }) => (
              <Input
                type="date"
                value={field.value ? String(field.value).slice(0, 10) : ""}
                onChange={(e) => field.onChange(e.target.value || undefined)}
                onBlur={field.onBlur}
              />
            )}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Valid To (optional)</label>
          <Controller
            name="validTo"
            control={form.control}
            render={({ field }) => (
              <Input
                type="date"
                value={field.value ? String(field.value).slice(0, 10) : ""}
                onChange={(e) => field.onChange(e.target.value || undefined)}
                onBlur={field.onBlur}
                min={
                  form.watch("validFrom")
                    ? String(form.watch("validFrom")).slice(0, 10)
                    : undefined
                }
              />
            )}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Controller
          name="overrideDiscounts"
          control={form.control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Switch
                id="override-discounts"
                checked={!!field.value}
                onCheckedChange={field.onChange}
              />
              <label
                htmlFor="override-discounts"
                className="text-xs text-muted-foreground"
              >
                Override existing discounts
              </label>
            </div>
          )}
        />
        <Controller
          name="allowStacking"
          control={form.control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Switch
                id="allow-stacking"
                checked={!!field.value}
                onCheckedChange={field.onChange}
              />
              <label
                htmlFor="allow-stacking"
                className="text-xs text-muted-foreground"
              >
                Allow stacking with discounts
              </label>
            </div>
          )}
        />
        <Controller
          name="isActive"
          control={form.control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Switch
                id="promo-active"
                checked={!!field.value}
                onCheckedChange={field.onChange}
              />
              <label
                htmlFor="promo-active"
                className="text-xs text-muted-foreground"
              >
                Active
              </label>
            </div>
          )}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium">Products (apply to)</label>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Controller
              name="applyToAll"
              control={form.control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Switch
                    id="apply-all"
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                  />
                  <label
                    htmlFor="apply-all"
                    className="text-xs text-muted-foreground"
                  >
                    Apply to all products
                  </label>
                </div>
              )}
            />
            {!applyToAll && (
              <Input
                placeholder="Search products..."
                className="h-8 w-40 text-xs"
                onChange={(e) => setProductSearch(e.target.value)}
              />
            )}
          </div>

          {!applyToAll && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Filter by Category
                </label>
                <div className="flex flex-wrap gap-1">
                  {categories.map((cat) => {
                    const selected = categoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`px-2 py-0.5 rounded-full text-xs border ${
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                        onClick={() => {
                          const exists = categoryIds.includes(cat.id);
                          form.setValue(
                            "categoryIds",
                            exists
                              ? categoryIds.filter((id) => id !== cat.id)
                              : [...categoryIds, cat.id],
                          );
                        }}
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
                    const selected = subCategories.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        className={`px-2 py-0.5 rounded-full text-xs border ${
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                        onClick={() => {
                          const exists = subCategories.includes(sub);
                          form.setValue(
                            "subCategories",
                            exists
                              ? subCategories.filter((s) => s !== sub)
                              : [...subCategories, sub],
                          );
                        }}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {filteredProducts.map((product) => {
                  const isSelected = productIds.includes(product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      className={`w-full flex items-center justify-between px-2 py-1 text-sm rounded hover:bg-muted ${
                        isSelected ? "bg-muted" : ""
                      }`}
                      onClick={() => {
                        const exists = productIds.includes(product.id);
                        form.setValue(
                          "productIds",
                          exists
                            ? productIds.filter((id) => id !== product.id)
                            : [...productIds, product.id],
                        );
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
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? "Saving..."
            : editingPromo
              ? "Update Promo"
              : "Create Promo"}
        </Button>
      </div>
    </form>
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
              form.reset(defaultValues);
              onReset();
            }}
          >
            <Plus className="h-4 w-4" />
            New Promo
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-xl" allowDismiss={false}>
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
