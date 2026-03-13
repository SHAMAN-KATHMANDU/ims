"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { GeneralTab } from "./form-tabs/GeneralTab";
import { DimensionsTab } from "./form-tabs/DimensionsTab";
import { VariationsTab } from "./form-tabs/VariationsTab";
import { DiscountsTab } from "./form-tabs/DiscountsTab";
import type {
  ProductFormValues,
  ProductVariationForm,
  ProductDiscountForm,
} from "../types";
import type { UseFormReturn } from "@/hooks/useForm";
import type { Product, Category } from "@/features/products";
import type { AttributeType } from "@/features/products";

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<ProductFormValues>;
  editingProduct: Product | null;
  categories: Category[];
  variations: ProductVariationForm[];
  discounts: ProductDiscountForm[];
  discountTypes: Array<{ id: string; name: string }>;
  attributeTypes?: AttributeType[];
  productAttributeTypeIds?: string[];
  onProductAttributeTypeIdsChange?: (ids: string[]) => void;
  defaultLocationId?: string;
  onDefaultLocationChange?: (locationId: string | undefined) => void;
  onReset: () => void;
  onAddVariation: () => void;
  onRemoveVariation: (index: number) => void;
  onUpdateVariation: (
    index: number,
    field: "stockQuantity" | "attributes",
    value:
      | string
      | Array<{ attributeTypeId: string; attributeValueId: string }>,
  ) => void;
  onUpdateSubVariants: (index: number, subVariants: string[]) => void;
  onAddPhoto: (variationIndex: number, photoUrl: string) => void;
  onRemovePhoto: (variationIndex: number, photoIndex: number) => void;
  onSetPrimaryPhoto: (variationIndex: number, photoIndex: number) => void;
  onShowError: (title: string, message: string) => void;
  validateProduct: (values: ProductFormValues) => Record<string, string> | null;
  /** When true, MRP < cost price was explicitly accepted by the user. */
  mrpBelowCpAccepted?: boolean;
  /** Called when user accepts or resets MRP-below-CP. */
  onMrpBelowCpAcceptedChange?: (accepted: boolean) => void;
  /** When true, render form only (no Dialog/trigger). For use on dedicated pages (e.g. mobile). */
  inline?: boolean;
  /** When false, do not render the Dialog trigger (parent opens dialog). Default true. */
  renderTrigger?: boolean;
  /** When true, disables the Add trigger (e.g. when plan limit reached). */
  addDisabled?: boolean;
}

export function ProductForm({
  open,
  onOpenChange,
  form,
  editingProduct,
  categories,
  variations,
  discounts,
  discountTypes,
  attributeTypes = [],
  productAttributeTypeIds = [],
  onProductAttributeTypeIdsChange,
  defaultLocationId,
  onDefaultLocationChange,
  onReset,
  onAddVariation,
  onRemoveVariation,
  onUpdateVariation,
  onUpdateSubVariants,
  onAddPhoto,
  onRemovePhoto,
  onSetPrimaryPhoto,
  onShowError,
  validateProduct,
  mrpBelowCpAccepted,
  onMrpBelowCpAcceptedChange,
  inline = false,
  renderTrigger = true,
  addDisabled = false,
}: ProductFormProps) {
  const [dialogTab, setDialogTab] = useState("general");

  // Reset dialog tab when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setDialogTab("general");
    }
  }, [open]);

  // Tab navigation functions
  const tabs = ["general", "dimensions", "variations", "discounts"];
  const currentTabIndex = tabs.indexOf(dialogTab);
  const canGoNext = currentTabIndex < tabs.length - 1;
  const canGoPrev = currentTabIndex > 0;

  const handleNext = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!canGoNext) return;

    const values = form.values;
    let validationErrors: Record<string, string> | null = null;

    if (dialogTab === "general") {
      const errs = validateProduct?.(values);
      if (errs) {
        const generalKeys = [
          "name",
          "categoryId",
          "imsCode",
          "costPrice",
          "mrp",
        ];
        const hasGeneralError = generalKeys.some((k) => errs![k]);
        if (hasGeneralError) validationErrors = errs;
      }
    } else if (dialogTab === "dimensions") {
      const dimKeys = ["length", "breadth", "height", "weight"] as const;
      const dimErrors: Record<string, string> = {};
      for (const key of dimKeys) {
        const val = values[key];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          const num = Number(val);
          if (isNaN(num) || num < 0) {
            dimErrors[key] =
              `${key.charAt(0).toUpperCase() + key.slice(1)} must be a valid non-negative number`;
          }
        }
      }
      if (Object.keys(dimErrors).length > 0) validationErrors = dimErrors;
    } else if (dialogTab === "variations") {
      const errs = validateProduct?.(values);
      if (errs) {
        const hasVariationError =
          errs._form ||
          Object.keys(errs).some((k) => k.startsWith("variation_"));
        if (hasVariationError) validationErrors = errs;
      }
    }

    if (validationErrors) {
      const errorMessages = Object.values(validationErrors).filter(Boolean);
      onShowError(
        "Validation Error",
        errorMessages.slice(0, 3).join(". ") +
          (errorMessages.length > 3 ? "..." : ""),
      );
      return;
    }

    const nextTab = tabs[currentTabIndex + 1];
    if (nextTab) setDialogTab(nextTab);
  };

  const handlePrev = (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (canGoPrev) {
      const prevTab = tabs[currentTabIndex - 1];
      if (prevTab) setDialogTab(prevTab);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    onReset();
  };

  const formContent = (
    <form
      onSubmit={async (e) => {
        // Only submit if we're on the last tab (discounts)
        if (dialogTab !== "discounts") {
          e.preventDefault();
          handleNext();
          return;
        }

        // Prevent default form submission
        e.preventDefault();

        // Manually validate before submitting
        if (validateProduct) {
          const validationErrors = validateProduct(form.values);

          if (validationErrors) {
            // Find the first tab with errors
            let errorTab = "general";
            if (
              validationErrors.name ||
              validationErrors.categoryId ||
              validationErrors.costPrice ||
              validationErrors.mrp
            ) {
              errorTab = "general";
            } else if (
              validationErrors.length ||
              validationErrors.breadth ||
              validationErrors.height ||
              validationErrors.weight
            ) {
              errorTab = "dimensions";
            } else if (
              validationErrors._form ||
              Object.keys(validationErrors).some((key) =>
                key.startsWith("variation_"),
              )
            ) {
              errorTab = "variations";
            }

            // Navigate to the tab with errors
            setDialogTab(errorTab);

            // Show error dialog
            const errorMessages = Object.entries(validationErrors)
              .filter(([key]) => key !== "_form")
              .map(([, message]) => message)
              .filter(Boolean);

            const formError = validationErrors._form;
            const allErrors = formError
              ? [formError, ...errorMessages]
              : errorMessages;

            onShowError(
              "Validation Error",
              allErrors.length > 0
                ? allErrors.slice(0, 3).join(". ") +
                    (allErrors.length > 3 ? "..." : "")
                : "Please fill in all required fields.",
            );
            return;
          }
        }

        // If validation passes, proceed with form submission
        await form.handleSubmit(e);
      }}
    >
      <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
        <Tabs value={dialogTab} onValueChange={setDialogTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="dimensions">Dimensions</TabsTrigger>
            <TabsTrigger value="variations">Variations</TabsTrigger>
            <TabsTrigger value="discounts">Discounts</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <GeneralTab
              form={form}
              categories={categories}
              isCreating={!editingProduct}
              defaultLocationId={defaultLocationId}
              onDefaultLocationChange={onDefaultLocationChange}
              mrpBelowCpAccepted={mrpBelowCpAccepted}
              onMrpBelowCpAcceptedChange={onMrpBelowCpAcceptedChange}
            />
          </TabsContent>

          <TabsContent value="dimensions" className="space-y-4 mt-4">
            <DimensionsTab form={form} />
          </TabsContent>

          <TabsContent value="variations" className="space-y-4 mt-4">
            <VariationsTab
              variations={variations}
              form={form}
              onAdd={onAddVariation}
              onRemove={onRemoveVariation}
              onUpdate={onUpdateVariation}
              onUpdateSubVariants={onUpdateSubVariants}
              onAddPhoto={onAddPhoto}
              onRemovePhoto={onRemovePhoto}
              onSetPrimaryPhoto={onSetPrimaryPhoto}
              attributeTypes={attributeTypes}
              productAttributeTypeIds={productAttributeTypeIds}
              onProductAttributeTypeIdsChange={onProductAttributeTypeIdsChange}
            />
          </TabsContent>

          <TabsContent value="discounts" className="space-y-4 mt-4">
            <DiscountsTab discounts={discounts} discountTypes={discountTypes} />
          </TabsContent>
        </Tabs>
      </div>

      {form.errors._form && (
        <p className="text-sm text-destructive mt-4">{form.errors._form}</p>
      )}
      <div className="flex gap-2 justify-between mt-6 border-t pt-4">
        <div className="flex gap-2">
          {canGoPrev && (
            <Button type="button" variant="outline" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          {canGoNext ? (
            <Button type="button" onClick={handleNext}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" disabled={form.isLoading}>
              {form.isLoading ? "Saving..." : editingProduct ? "Update" : "Add"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );

  if (inline) {
    return (
      <div className="max-w-4xl space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">
            {editingProduct ? "Edit Product" : "Add Product"}
          </h2>
        </div>
        {formContent}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {renderTrigger && (
        <DialogTrigger asChild>
          <Button
            onClick={() => {
              onReset();
            }}
            className="gap-2"
            disabled={addDisabled}
          >
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] max-w-4xl" allowDismiss={false}>
        <DialogHeader>
          <DialogTitle>
            {editingProduct ? "Edit Product" : "Add Product"}
          </DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
