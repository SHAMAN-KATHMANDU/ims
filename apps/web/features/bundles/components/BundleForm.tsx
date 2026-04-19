"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Plus } from "lucide-react";
import { useProducts } from "@/features/products";
import { BundleFormSchema, type BundleFormInput } from "../validation";
import type { Bundle, CreateBundleData } from "../types";

interface BundleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingBundle: Bundle | null;
  onSubmit: (data: CreateBundleData) => Promise<void>;
  onReset: () => void;
  isLoading?: boolean;
  inline?: boolean;
  renderTrigger?: boolean;
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const defaultValues: BundleFormInput = {
  name: "",
  slug: "",
  description: "",
  productIds: [],
  pricingStrategy: "SUM",
  discountPct: undefined,
  fixedPrice: undefined,
  active: true,
};

export function BundleForm({
  open,
  onOpenChange,
  editingBundle,
  onSubmit,
  onReset,
  isLoading,
  inline = false,
  renderTrigger = true,
}: BundleFormProps) {
  const [productSearch, setProductSearch] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);

  const form = useForm<BundleFormInput>({
    resolver: zodResolver(BundleFormSchema),
    mode: "onBlur",
    defaultValues,
  });

  const { data: allProducts = [] } = useProducts();

  useEffect(() => {
    if (open && editingBundle) {
      setSlugDirty(true);
      form.reset({
        name: editingBundle.name,
        slug: editingBundle.slug,
        description: editingBundle.description ?? "",
        productIds: editingBundle.productIds,
        pricingStrategy: editingBundle.pricingStrategy,
        discountPct: editingBundle.discountPct ?? undefined,
        fixedPrice: editingBundle.fixedPrice ?? undefined,
        active: editingBundle.active,
      });
    } else if (!open) {
      form.reset(defaultValues);
      setProductSearch("");
      setSlugDirty(false);
    }
  }, [open, editingBundle, form]);

  const nameValue = form.watch("name");
  useEffect(() => {
    if (editingBundle || slugDirty) return;
    form.setValue("slug", slugify(nameValue || ""));
  }, [nameValue, slugDirty, editingBundle, form]);

  const productIds = form.watch("productIds") ?? [];
  const pricingStrategy = form.watch("pricingStrategy");

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return allProducts ?? [];
    return (allProducts ?? []).filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.imsCode?.toLowerCase().includes(term),
    );
  }, [allProducts, productSearch]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload: CreateBundleData = {
      name: values.name,
      slug: values.slug,
      description: values.description?.trim() ? values.description : null,
      productIds: values.productIds,
      pricingStrategy: values.pricingStrategy,
      discountPct:
        values.pricingStrategy === "DISCOUNT_PCT"
          ? (values.discountPct ?? null)
          : null,
      fixedPrice:
        values.pricingStrategy === "FIXED" ? (values.fixedPrice ?? null) : null,
      active: values.active,
    };
    await onSubmit(payload);
    onOpenChange(false);
    onReset();
  });

  const handleCancel = () => {
    onOpenChange(false);
    onReset();
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bundle-name">Name *</Label>
          <Input
            id="bundle-name"
            {...form.register("name")}
            placeholder="e.g. Summer Starter Pack"
            aria-invalid={!!form.formState.errors.name}
            aria-describedby={
              form.formState.errors.name ? "bundle-name-error" : undefined
            }
          />
          {form.formState.errors.name && (
            <p
              id="bundle-name-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {form.formState.errors.name.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bundle-slug">Slug *</Label>
          <Controller
            name="slug"
            control={form.control}
            render={({ field }) => (
              <Input
                id="bundle-slug"
                {...field}
                onChange={(e) => {
                  setSlugDirty(true);
                  field.onChange(e.target.value);
                }}
                placeholder="summer-starter-pack"
                aria-invalid={!!form.formState.errors.slug}
                aria-describedby={
                  form.formState.errors.slug ? "bundle-slug-error" : undefined
                }
              />
            )}
          />
          {form.formState.errors.slug && (
            <p
              id="bundle-slug-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {form.formState.errors.slug.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bundle-description">Description</Label>
        <Input
          id="bundle-description"
          {...form.register("description")}
          placeholder="Short description (optional)"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="bundle-pricing">Pricing strategy *</Label>
          <Controller
            name="pricingStrategy"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) =>
                  field.onChange(value as BundleFormInput["pricingStrategy"])
                }
              >
                <SelectTrigger id="bundle-pricing" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUM">Sum of items</SelectItem>
                  <SelectItem value="DISCOUNT_PCT">Discount %</SelectItem>
                  <SelectItem value="FIXED">Fixed price</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {pricingStrategy === "DISCOUNT_PCT" && (
          <div className="space-y-2">
            <Label htmlFor="bundle-discount-pct">Discount % *</Label>
            <Controller
              name="discountPct"
              control={form.control}
              render={({ field }) => (
                <Input
                  id="bundle-discount-pct"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                    )
                  }
                  placeholder="e.g. 15"
                  aria-invalid={!!form.formState.errors.discountPct}
                  aria-describedby={
                    form.formState.errors.discountPct
                      ? "bundle-discount-pct-error"
                      : undefined
                  }
                />
              )}
            />
            {form.formState.errors.discountPct && (
              <p
                id="bundle-discount-pct-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {form.formState.errors.discountPct.message}
              </p>
            )}
          </div>
        )}

        {pricingStrategy === "FIXED" && (
          <div className="space-y-2">
            <Label htmlFor="bundle-fixed-price">Fixed price *</Label>
            <Controller
              name="fixedPrice"
              control={form.control}
              render={({ field }) => (
                <Input
                  id="bundle-fixed-price"
                  type="number"
                  min={0}
                  step={1}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                    )
                  }
                  placeholder="Amount in smallest currency unit"
                  aria-invalid={!!form.formState.errors.fixedPrice}
                  aria-describedby={
                    form.formState.errors.fixedPrice
                      ? "bundle-fixed-price-error"
                      : undefined
                  }
                />
              )}
            />
            {form.formState.errors.fixedPrice && (
              <p
                id="bundle-fixed-price-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {form.formState.errors.fixedPrice.message}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="bundle-active" className="block">
            Status
          </Label>
          <Controller
            name="active"
            control={form.control}
            render={({ field }) => (
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  id="bundle-active"
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                />
                <span className="text-sm text-muted-foreground">
                  {field.value ? "Active" : "Inactive"}
                </span>
              </div>
            )}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Label className="text-base">Products *</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Select one or more products to include in this bundle.
            </p>
          </div>
          <Input
            id="bundle-product-search"
            placeholder="Search products..."
            className="w-full sm:max-w-xs"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            aria-label="Search products"
          />
        </div>

        <div
          role="group"
          aria-label="Bundle products"
          className="max-h-64 min-h-40 overflow-y-auto rounded-md border p-3 space-y-1"
        >
          {filteredProducts.map((product) => {
            const isSelected = productIds.includes(product.id);
            return (
              <button
                key={product.id}
                type="button"
                aria-pressed={isSelected}
                className={`w-full flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-sm hover:bg-muted ${
                  isSelected ? "bg-muted" : ""
                }`}
                onClick={() => {
                  form.setValue(
                    "productIds",
                    isSelected
                      ? productIds.filter((id) => id !== product.id)
                      : [...productIds, product.id],
                    { shouldValidate: true },
                  );
                }}
              >
                <span className="truncate">
                  {product.name}{" "}
                  <span className="text-muted-foreground">
                    ({product.imsCode ?? "—"})
                  </span>
                </span>
                {isSelected && (
                  <Badge variant="outline" className="shrink-0 text-xs">
                    Selected
                  </Badge>
                )}
              </button>
            );
          })}
          {filteredProducts.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No products match your search
            </p>
          )}
        </div>
        {form.formState.errors.productIds && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.productIds.message as string}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {productIds.length} product{productIds.length === 1 ? "" : "s"}{" "}
          selected
        </p>
      </div>

      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? "Saving..."
            : editingBundle
              ? "Update Bundle"
              : "Create Bundle"}
        </Button>
      </div>
    </form>
  );

  if (inline) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            {editingBundle ? "Edit Bundle" : "Create Bundle"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {editingBundle
              ? "Update the bundle details below."
              : "Create a new product bundle."}
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
              setSlugDirty(false);
              onReset();
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Bundle
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="z-60 max-h-[min(90vh,900px)] max-w-2xl overflow-hidden p-0"
        allowDismiss={false}
      >
        <DialogHeader className="space-y-1 px-6 pt-6">
          <DialogTitle>
            {editingBundle ? "Edit Bundle" : "Create Bundle"}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(min(90vh,900px)-4.5rem)] overflow-y-auto px-6 pb-6">
          {formContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
