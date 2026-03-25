"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ListTree, Plus } from "lucide-react";
import { useProducts, useCategories } from "@/features/products";
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
  const [sectionTab, setSectionTab] = useState<"details" | "scope">("details");

  const form = useForm<PromoFormInput>({
    resolver: zodResolver(PromoFormSchema),
    mode: "onBlur",
    defaultValues,
  });

  const { data: allProducts = [] } = useProducts();
  const { data: categories = [] } = useCategories();

  const categoryIds = form.watch("categoryIds") ?? [];
  const subCategories = form.watch("subCategories") ?? [];
  const categoryIdsKey = JSON.stringify(categoryIds);
  const subCategoriesKey = JSON.stringify(subCategories);

  const filteredSubcategories = useMemo(() => {
    const products = allProducts ?? [];
    const filtered =
      categoryIds.length > 0
        ? products.filter((p) => categoryIds.includes(p.categoryId))
        : products;
    const set = new Set<string>();
    filtered.forEach((p) => {
      if (p.subCategory) set.add(p.subCategory);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
    // categoryIdsKey used instead of categoryIds to avoid unstable deps (form.watch returns new array ref each render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProducts, categoryIdsKey]);

  const filteredProducts = useMemo(() => {
    let products = allProducts ?? [];
    if (categoryIds.length > 0) {
      products = products.filter((p) => categoryIds.includes(p.categoryId));
    }
    if (subCategories.length > 0) {
      products = products.filter(
        (p) => p.subCategory && subCategories.includes(p.subCategory),
      );
    }
    if (productSearch.trim()) {
      const term = productSearch.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p as { imsCode?: string }).imsCode?.toLowerCase().includes(term),
      );
    }
    return products;
    // categoryIdsKey/subCategoriesKey used instead of raw arrays to avoid unstable deps (form.watch returns new refs each render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProducts, categoryIdsKey, subCategoriesKey, productSearch]);

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

  useEffect(() => {
    if (open) setSectionTab("details");
  }, [open, editingPromo?.id]);

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
  const applyToAll = form.watch("applyToAll");

  useEffect(() => {
    if (categoryIds.length === 0) return;
    const validSubs = new Set(filteredSubcategories);
    const cleaned = subCategories.filter((s) => validSubs.has(s));
    if (cleaned.length !== subCategories.length) {
      form.setValue("subCategories", cleaned);
    }
    // categoryIdsKey/subCategoriesKey used instead of raw arrays to avoid unstable deps (form.watch returns new array refs each render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryIdsKey, filteredSubcategories, subCategoriesKey, form]);

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs
        value={sectionTab}
        onValueChange={(v) => setSectionTab(v as "details" | "scope")}
        className="w-full"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:max-w-md">
          <TabsTrigger value="details" className="gap-2 py-2.5">
            <Package className="h-4 w-4 shrink-0" aria-hidden />
            <span>Details</span>
          </TabsTrigger>
          <TabsTrigger value="scope" className="gap-2 py-2.5">
            <ListTree className="h-4 w-4 shrink-0" aria-hidden />
            <span>Product scope</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6 space-y-6 outline-none">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="promo-code">Code *</Label>
              <Controller
                name="code"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="promo-code"
                    {...field}
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase())
                    }
                    placeholder="e.g. FESTIVE20"
                  />
                )}
              />
              {form.formState.errors.code && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.code.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-eligibility">Eligibility</Label>
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
                    <SelectTrigger id="promo-eligibility" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Customers</SelectItem>
                      <SelectItem value="MEMBER">Members Only</SelectItem>
                      <SelectItem value="NON_MEMBER">
                        Non-Members Only
                      </SelectItem>
                      <SelectItem value="WHOLESALE">Wholesale Only</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-description">Description</Label>
            <Input
              id="promo-description"
              {...form.register("description")}
              placeholder="Short description for internal use"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="promo-value-type">Discount type</Label>
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
                    <SelectTrigger id="promo-value-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                      <SelectItem value="FLAT">Flat amount</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-value">Value</Label>
              <Input
                id="promo-value"
                type="number"
                min={0}
                step={0.01}
                {...form.register("value", { valueAsNumber: true })}
              />
              {form.formState.errors.value && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.value.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-usage-limit">Usage limit (optional)</Label>
              <Controller
                name="usageLimit"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="promo-usage-limit"
                    type="number"
                    min={0}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                      )
                    }
                    placeholder="Unlimited if empty"
                  />
                )}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="promo-valid-from">Valid from (optional)</Label>
              <Controller
                name="validFrom"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="promo-valid-from"
                    type="date"
                    value={field.value ? String(field.value).slice(0, 10) : ""}
                    onChange={(e) =>
                      field.onChange(e.target.value || undefined)
                    }
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-valid-to">Valid to (optional)</Label>
              <Controller
                name="validTo"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="promo-valid-to"
                    type="date"
                    value={field.value ? String(field.value).slice(0, 10) : ""}
                    onChange={(e) =>
                      field.onChange(e.target.value || undefined)
                    }
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

          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
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
                  <Label
                    htmlFor="override-discounts"
                    className="text-sm font-normal text-muted-foreground"
                  >
                    Override existing discounts
                  </Label>
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
                  <Label
                    htmlFor="allow-stacking"
                    className="text-sm font-normal text-muted-foreground"
                  >
                    Allow stacking with discounts
                  </Label>
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
                  <Label
                    htmlFor="promo-active"
                    className="text-sm font-normal text-muted-foreground"
                  >
                    Active
                  </Label>
                </div>
              )}
            />
          </div>
        </TabsContent>

        <TabsContent value="scope" className="mt-6 space-y-6 outline-none">
          <div className="space-y-4">
            <div>
              <Label className="text-base">Products (apply to)</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Limit this code to specific products, or apply store-wide.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                    <Label
                      htmlFor="apply-all"
                      className="text-sm font-normal text-muted-foreground"
                    >
                      Apply to all products
                    </Label>
                  </div>
                )}
              />
              {!applyToAll && (
                <Input
                  id="promo-product-search"
                  placeholder="Search products by name or code..."
                  className="w-full sm:max-w-xs"
                  onChange={(e) => setProductSearch(e.target.value)}
                  aria-label="Search products"
                />
              )}
            </div>

            {!applyToAll && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Categories</Label>
                  <MultiSelectCombobox
                    options={categories.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    selected={categoryIds}
                    onChange={(ids) => form.setValue("categoryIds", ids)}
                    placeholder="Add categories..."
                    emptyMessage="No categories found"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Subcategories</Label>
                  <MultiSelectCombobox
                    options={filteredSubcategories.map((s) => ({
                      value: s,
                      label: s,
                    }))}
                    selected={subCategories}
                    onChange={(subs) => form.setValue("subCategories", subs)}
                    placeholder="Add subcategories..."
                    emptyMessage="No subcategories found"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Select products</Label>
                  <div className="max-h-56 min-h-40 overflow-y-auto rounded-md border p-3 space-y-1">
                    {filteredProducts.map((product) => {
                      const isSelected = productIds.includes(product.id);
                      return (
                        <button
                          key={product.id}
                          type="button"
                          className={`w-full flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-sm hover:bg-muted ${
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
                            <span className="text-muted-foreground">
                              (
                              {(product as { imsCode?: string }).imsCode ?? "—"}
                              )
                            </span>
                          </span>
                          {isSelected && (
                            <Badge
                              variant="outline"
                              className="shrink-0 text-xs"
                            >
                              Selected
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No products match your filters
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 border-t pt-6">
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
      <div className="max-w-3xl space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
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
      <DialogContent
        className="z-60 max-h-[min(90vh,900px)] max-w-2xl overflow-hidden p-0"
        allowDismiss={false}
      >
        <DialogHeader className="space-y-1 px-6 pt-6">
          <DialogTitle>
            {editingPromo ? "Edit Promo Code" : "Create Promo Code"}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(min(90vh,900px)-4.5rem)] overflow-y-auto px-6 pb-6">
          {formContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
