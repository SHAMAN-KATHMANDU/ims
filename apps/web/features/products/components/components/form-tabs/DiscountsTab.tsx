"use client";

/**
 * Product form tab for discount rows.
 * View-only: discounts are managed from the Discounts page (sidebar).
 * Not the discounts list page – see ../DiscountsTab.tsx for the full page content.
 */

import { Label } from "@/components/ui/label";
import type { ProductDiscountForm } from "../../types";

interface DiscountsTabProps {
  discounts: ProductDiscountForm[];
  discountTypes: Array<{ id: string; name: string }>;
}

const defaultTypeNames = ["Normal", "Special", "Member", "Wholesale"];

export function DiscountsTab({ discounts, discountTypes }: DiscountsTabProps) {
  const nameById = new Map(discountTypes.map((dt) => [dt.id, dt.name]));

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label>Discounts</Label>
      </div>
      {discounts.length > 0 ? (
        <div className="space-y-4 border rounded-lg p-4">
          {discounts
            .map((discount, originalIndex) => ({ discount, originalIndex }))
            .sort((a, b) => {
              const aIsDefault = defaultTypeNames.includes(
                nameById.get(a.discount.discountTypeId) ?? "",
              );
              const bIsDefault = defaultTypeNames.includes(
                nameById.get(b.discount.discountTypeId) ?? "",
              );
              if (aIsDefault && !bIsDefault) return -1;
              if (!aIsDefault && bIsDefault) return 1;
              return 0;
            })
            .map(({ discount }) => {
              const isDefault = defaultTypeNames.includes(
                nameById.get(discount.discountTypeId) ?? "",
              );
              const typeName =
                nameById.get(discount.discountTypeId) ?? "Unknown";

              return (
                <div
                  key={`${discount.discountTypeId}-${discount.discountPercentage}`}
                  className="space-y-2 border-b pb-4 last:border-b-0 last:pb-0"
                >
                  {isDefault && (
                    <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded w-fit">
                      Default Discount
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Type
                      </span>
                      <p className="font-medium">{typeName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Discount %
                      </span>
                      <p className="font-medium">
                        {discount.discountPercentage}%
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Status
                      </span>
                      <p className="font-medium">
                        {discount.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">
                        Dates
                      </span>
                      <p className="font-medium">
                        {discount.startDate || discount.endDate
                          ? `${discount.startDate || "—"} to ${discount.endDate || "—"}`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4">
          No discounts assigned. Manage discounts from the Discounts page in the
          sidebar.
        </p>
      )}
    </div>
  );
}
