"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LocationSelector } from "@/components/ui/location-selector";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import type { ProductFormValues } from "../../types";
import type { Category } from "@/features/products";
import type { UseFormReturn } from "@/hooks/useForm";
import { useVendorsPaginated } from "@/features/vendors";
import { useAuthStore, selectIsAdmin } from "@/store/auth-store";
import { useCategorySubcategories } from "@/features/products";

interface GeneralTabProps {
  form: UseFormReturn<ProductFormValues>;
  categories: Category[];
  isCreating?: boolean;
  defaultLocationId?: string;
  onDefaultLocationChange?: (locationId: string | undefined) => void;
  /** When true, MRP < cost price is explicitly accepted by the user. */
  mrpBelowCpAccepted?: boolean;
  /** Called when user accepts or resets MRP-below-CP. */
  onMrpBelowCpAcceptedChange?: (accepted: boolean) => void;
}

export function GeneralTab({
  form,
  categories,
  isCreating,
  defaultLocationId,
  onDefaultLocationChange,
  mrpBelowCpAccepted = false,
  onMrpBelowCpAcceptedChange,
}: GeneralTabProps) {
  const [showMrpBelowCpWarning, setShowMrpBelowCpWarning] = useState(false);
  const isAdmin = useAuthStore(selectIsAdmin);

  useEffect(() => {
    const costPrice = parseFloat((form.values.costPrice ?? "").trim() || "0");
    const mrp = parseFloat((form.values.mrp ?? "").trim() || "0");
    const shouldWarn =
      !Number.isNaN(costPrice) &&
      costPrice > 0 &&
      !Number.isNaN(mrp) &&
      mrp > 0 &&
      mrp < costPrice &&
      !mrpBelowCpAccepted;
    setShowMrpBelowCpWarning(shouldWarn);
  }, [form.values.costPrice, form.values.mrp, mrpBelowCpAccepted]);
  const { data: vendorsResponse } = useVendorsPaginated({
    page: 1,
    limit: 100,
  });
  const vendors = vendorsResponse?.data ?? [];

  const { data: subcategories = [] } = useCategorySubcategories(
    form.values.categoryId ?? "",
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="imsCode">IMS Code (Barcode)</Label>
        <Input
          id="imsCode"
          value={form.values.imsCode}
          onChange={(e) => form.handleChange("imsCode", e.target.value)}
          placeholder="e.g. SHIRT-001"
        />
        {form.errors.imsCode && (
          <p className="text-sm text-destructive">{form.errors.imsCode}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Product Name</Label>
        <Input
          id="name"
          value={form.values.name}
          onChange={(e) => form.handleChange("name", e.target.value)}
          placeholder="e.g. Cotton T-Shirt"
        />
        {form.errors.name && (
          <p className="text-sm text-destructive">{form.errors.name}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="categoryId">Category</Label>
        <Select
          value={form.values.categoryId}
          onValueChange={(value) => form.handleChange("categoryId", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.errors.categoryId && (
          <p className="text-sm text-destructive">{form.errors.categoryId}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="subCategory">Sub-Category (Optional)</Label>
        {form.values.categoryId && subcategories.length > 0 ? (
          <Select
            value={form.values.subCategory || "none"}
            onValueChange={(value) =>
              form.handleChange("subCategory", value === "none" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subcategory" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {subcategories.map((sub) => (
                <SelectItem key={sub} value={sub}>
                  {sub}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="subCategory"
            value={form.values.subCategory}
            onChange={(e) => form.handleChange("subCategory", e.target.value)}
            placeholder="Enter subcategory (optional)"
          />
        )}
      </div>
      {isAdmin && (
        <div className="space-y-2">
          <Label htmlFor="vendorId">Vendor (Optional)</Label>
          <Select
            value={form.values.vendorId ?? "none"}
            onValueChange={(value) =>
              form.handleChange("vendorId", value === "none" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {vendors.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {isCreating && onDefaultLocationChange && (
        <div className="space-y-2">
          <Label>Default location for new stock</Label>
          <LocationSelector
            value={defaultLocationId ?? "all"}
            onChange={(id) =>
              onDefaultLocationChange(id === "all" ? undefined : id)
            }
            placeholder="Choose location"
            allLabel="Use default warehouse"
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            New product stock will be added to this location. If not set, the
            system default warehouse is used.
          </p>
        </div>
      )}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="description">Product Description</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-label="Product description help"
              />
            </TooltipTrigger>
            <TooltipContent side="right">
              A brief description of the product for internal use or display.
            </TooltipContent>
          </Tooltip>
        </div>
        <Textarea
          id="description"
          value={form.values.description}
          onChange={(e) => form.handleChange("description", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="costPrice">Cost Price</Label>
          <NumericInput
            id="costPrice"
            value={form.values.costPrice}
            onChange={(v) => {
              form.handleChange("costPrice", v);
              onMrpBelowCpAcceptedChange?.(false);
              setShowMrpBelowCpWarning(false);
            }}
            error={form.errors.costPrice}
            allowDecimals
            min={0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mrp">MRP</Label>
          <NumericInput
            id="mrp"
            value={form.values.mrp}
            onChange={(v) => {
              form.handleChange("mrp", v);
              onMrpBelowCpAcceptedChange?.(false);
            }}
            error={form.errors.mrp}
            allowDecimals
            min={0}
          />
          {showMrpBelowCpWarning && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm dark:border-amber-900 dark:bg-amber-950/50">
              <span className="text-amber-800 dark:text-amber-200">
                MRP is below cost price.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950"
                onClick={() => {
                  onMrpBelowCpAcceptedChange?.(true);
                  setShowMrpBelowCpWarning(false);
                }}
              >
                Accept anyway
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
