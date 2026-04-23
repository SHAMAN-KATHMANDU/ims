"use client";

/**
 * Product form tab for assigning discounts to the product.
 * User can add/remove discount type + percentage rows; changes are applied on product save.
 */

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
import { Trash2, Plus } from "lucide-react";
import type { ProductDiscountForm } from "../types";
import { calculateDiscountedPrice } from "../utils/helpers";
import { formatCurrency } from "@/lib/format";

const emptyDiscountRow = (): ProductDiscountForm => ({
  discountTypeId: "",
  discountPercentage: "0",
  startDate: "",
  endDate: "",
  isActive: true,
});

interface DiscountsTabProps {
  discounts: ProductDiscountForm[];
  discountTypes: Array<{ id: string; name: string }>;
  onDiscountsChange?: (discounts: ProductDiscountForm[]) => void;
  /** MRP from General tab — used to show discounted price next to each percentage row */
  mrp?: string | number;
}

export function DiscountsTab({
  discounts,
  discountTypes,
  onDiscountsChange,
  mrp,
}: DiscountsTabProps) {
  const canEdit = typeof onDiscountsChange === "function";
  const mrpNum =
    mrp === undefined || mrp === null || String(mrp).trim() === ""
      ? NaN
      : Number(mrp);
  const mrpValid = Number.isFinite(mrpNum) && mrpNum > 0;
  const usedTypeIds = new Set(
    discounts.map((d) => d.discountTypeId).filter(Boolean),
  );

  const updateRow = (index: number, patch: Partial<ProductDiscountForm>) => {
    if (!canEdit) return;
    const next = discounts.map((d, i) =>
      i === index ? { ...d, ...patch } : d,
    );
    onDiscountsChange(next);
  };

  const removeRow = (index: number) => {
    if (!canEdit) return;
    onDiscountsChange(discounts.filter((_, i) => i !== index));
  };

  const addRow = () => {
    if (!canEdit) return;
    onDiscountsChange([...discounts, emptyDiscountRow()]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label>Discounts</Label>
        {canEdit && (
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-3 w-3 mr-1" aria-hidden="true" /> Add discount
          </Button>
        )}
      </div>

      {discounts.length === 0 && !canEdit && (
        <p className="text-sm text-muted-foreground py-4">
          No discounts assigned.
        </p>
      )}

      {discounts.length === 0 && canEdit && (
        <div className="text-sm text-muted-foreground py-4 space-y-1">
          <p>
            No discounts assigned. Add one or more discount types and
            percentages below; they will be saved with the product.
          </p>
          {discountTypes.length === 0 && (
            <p>
              Create discount types first from the Discounts page in the
              sidebar.
            </p>
          )}
        </div>
      )}

      {discounts.length > 0 && (
        <div className="space-y-3 border rounded-lg p-4">
          {discounts.map((discount, index) => {
            const pct = Number(discount.discountPercentage);
            const pctValid = Number.isFinite(pct) && pct >= 0 && pct <= 100;
            const priceAfter =
              mrpValid && pctValid
                ? calculateDiscountedPrice(mrpNum, pct)
                : null;

            return (
              <div
                key={index}
                className="flex flex-wrap items-end gap-3 gap-y-2 border-b pb-3 last:border-b-0 last:pb-0"
              >
                <div className="flex-1 min-w-[140px] space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Discount type
                  </Label>
                  {canEdit ? (
                    <Select
                      value={discount.discountTypeId || ""}
                      onValueChange={(value) =>
                        updateRow(index, { discountTypeId: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {discountTypes.map((dt) => (
                          <SelectItem
                            key={dt.id}
                            value={dt.id}
                            disabled={
                              usedTypeIds.has(dt.id) &&
                              discount.discountTypeId !== dt.id
                            }
                          >
                            {dt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium py-2">
                      {discountTypes.find(
                        (t) => t.id === discount.discountTypeId,
                      )?.name ?? "—"}
                    </p>
                  )}
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs text-muted-foreground">%</Label>
                  {canEdit ? (
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={discount.discountPercentage}
                      onChange={(e) =>
                        updateRow(index, {
                          discountPercentage: e.target.value,
                        })
                      }
                      placeholder="0"
                    />
                  ) : (
                    <p className="text-sm font-medium py-2">
                      {discount.discountPercentage}%
                    </p>
                  )}
                </div>
                <div className="min-w-[120px] space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    After discount
                  </Label>
                  {mrpValid ? (
                    priceAfter != null ? (
                      <p className="text-sm font-medium tabular-nums py-2">
                        {formatCurrency(priceAfter)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">—</p>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">
                      Set MRP to see amount
                    </p>
                  )}
                </div>
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive"
                    onClick={() => removeRow(index)}
                    aria-label={`Remove discount ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canEdit && discounts.length > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-3 w-3 mr-1" aria-hidden="true" /> Add discount
        </Button>
      )}
    </div>
  );
}
