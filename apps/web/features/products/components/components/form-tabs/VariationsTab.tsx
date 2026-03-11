"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import type { ProductVariationForm } from "../../types";
import type { UseFormReturn } from "@/hooks/useForm";
import type { ProductFormValues } from "../../types";
import type { AttributeType } from "@/features/products";

interface VariationsTabProps {
  variations: ProductVariationForm[];
  form: UseFormReturn<ProductFormValues>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (
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
  attributeTypes?: AttributeType[];
  productAttributeTypeIds?: string[];
  onProductAttributeTypeIdsChange?: (ids: string[]) => void;
}

export function VariationsTab({
  variations,
  form,
  onAdd,
  onRemove,
  onUpdate,
  onUpdateSubVariants: _onUpdateSubVariants,
  onAddPhoto,
  onRemovePhoto,
  onSetPrimaryPhoto,
  attributeTypes = [],
  productAttributeTypeIds = [],
  onProductAttributeTypeIdsChange,
}: VariationsTabProps) {
  const selectedTypes = attributeTypes.filter((t) =>
    productAttributeTypeIds.includes(t.id),
  );

  const toggleAttributeType = (typeId: string, checked: boolean) => {
    if (!onProductAttributeTypeIdsChange) return;
    if (checked) {
      onProductAttributeTypeIdsChange([...productAttributeTypeIds, typeId]);
    } else {
      onProductAttributeTypeIdsChange(
        productAttributeTypeIds.filter((id) => id !== typeId),
      );
    }
  };

  const setVariationAttribute = (
    index: number,
    attributeTypeId: string,
    attributeValueId: string | null,
  ) => {
    const current = variations[index]?.attributes ?? [];
    const rest = current.filter((a) => a.attributeTypeId !== attributeTypeId);
    const next =
      attributeValueId == null
        ? rest
        : [...rest, { attributeTypeId, attributeValueId }];
    onUpdate(index, "attributes", next);
  };

  return (
    <div className="space-y-4">
      {attributeTypes.length > 0 && onProductAttributeTypeIdsChange && (
        <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
          <Label className="text-sm font-medium">
            Attribute types for this product
          </Label>
          <p className="text-xs text-muted-foreground">
            Select which attributes apply (e.g. Color, Size). Then set a value
            per variation below.
          </p>
          <div className="flex flex-wrap gap-4 pt-1">
            {attributeTypes.map((type) => (
              <label
                key={type.id}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={productAttributeTypeIds.includes(type.id)}
                  onCheckedChange={(checked) =>
                    toggleAttributeType(type.id, !!checked)
                  }
                />
                <span className="text-sm">{type.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <Label>
          Variations <span className="text-destructive">*</span>
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="gap-1"
        >
          <Plus className="h-3 w-3" /> Add Variation
        </Button>
      </div>
      {variations.length === 0 && (
        <p className="text-sm text-destructive">
          At least one variation is required
        </p>
      )}
      {variations.length > 0 && (
        <div className="space-y-4 border rounded-lg p-4">
          {variations.map((variation, index) => (
            <div
              key={index}
              className="space-y-3 border-b pb-4 last:border-b-0 last:pb-0"
            >
              {index === 0 && (
                <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                  Default Variation
                </div>
              )}
              <div className="flex gap-2 items-end flex-wrap">
                <div className="flex-1 min-w-[80px] space-y-1">
                  <Label htmlFor={`var-stock-${index}`} className="text-xs">
                    {variation.locationName
                      ? `Stock @ ${variation.locationName}`
                      : "Default stock"}
                  </Label>
                  <Input
                    id={`var-stock-${index}`}
                    type="number"
                    placeholder="0"
                    value={variation.stockQuantity}
                    onChange={(e) =>
                      onUpdate(index, "stockQuantity", e.target.value)
                    }
                  />
                  {form.errors[`variation_${index}_stock`] && (
                    <p className="text-xs text-destructive">
                      {form.errors[`variation_${index}_stock`]}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(index)}
                  className="mb-0"
                  disabled={variations.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              {selectedTypes.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {selectedTypes.map((type) => (
                    <div key={type.id} className="space-y-1 min-w-[100px]">
                      <Label className="text-xs">{type.name}</Label>
                      <Select
                        value={
                          variation.attributes?.find(
                            (a) => a.attributeTypeId === type.id,
                          )?.attributeValueId ?? ""
                        }
                        onValueChange={(valueId) =>
                          setVariationAttribute(index, type.id, valueId || null)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder={`Select ${type.name}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {(type.values ?? []).map((val) => (
                            <SelectItem
                              key={val.id}
                              value={val.id}
                              className="text-xs"
                            >
                              {val.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Photos (Optional)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const photoUrl = prompt("Enter photo URL:");
                      if (photoUrl && photoUrl.trim()) {
                        onAddPhoto(index, photoUrl.trim());
                      }
                    }}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Photo
                  </Button>
                </div>
                {variation.photos && variation.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {variation.photos.map((photo, photoIndex) => (
                      <div key={photoIndex} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.photoUrl}
                          alt={`Variation ${index + 1} photo ${photoIndex + 1}`}
                          className="h-20 w-full rounded border object-cover"
                          onError={(e) => {
                            e.currentTarget.src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3EInvalid%3C/text%3E%3C/svg%3E";
                          }}
                        />
                        {photo.isPrimary && (
                          <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1 rounded">
                            Primary
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          {!photo.isPrimary && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                onSetPrimaryPhoto(index, photoIndex)
                              }
                              className="h-6 text-xs"
                            >
                              Set Primary
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => onRemovePhoto(index, photoIndex)}
                            className="h-6 text-xs"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Add at least one variation (default stock required). Variant name can be
        auto-filled from attribute values. The first variation is the default.
      </p>
    </div>
  );
}
