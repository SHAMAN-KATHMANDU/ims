"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useProduct } from "../../hooks/use-products";
import {
  getVariationAttributeDisplay,
  getVariationTotal,
} from "../utils/helpers";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/features/products";

interface ProductDetailSheetProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
}: ProductDetailSheetProps) {
  const productId = open && product?.id ? product.id : "";
  const { data: fullProduct, isLoading } = useProduct(productId);
  const p = fullProduct ?? product;

  if (!p) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{p.name}</SheetTitle>
          <SheetDescription className="font-mono text-xs">
            IMS: {p.imsCode}
          </SheetDescription>
        </SheetHeader>

        {isLoading && !fullProduct ? (
          <div className="space-y-4 pt-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            {/* Category & MRP */}
            <div className="flex flex-wrap gap-4 text-sm">
              {p.category && (
                <div>
                  <span className="text-muted-foreground">Category: </span>
                  <span className="font-medium">{p.category.name}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">MRP: </span>
                <span className="font-mono font-semibold">
                  {formatCurrency(Number(p.mrp))}
                </span>
              </div>
            </div>

            {/* Description */}
            {p.description && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {p.description}
                  </p>
                </div>
              </>
            )}

            {/* Dimensions */}
            {(p.length != null ||
              p.breadth != null ||
              p.height != null ||
              p.weight != null) && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Dimensions</h4>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {p.length != null && <span>L: {p.length} cm</span>}
                    {p.breadth != null && <span>B: {p.breadth} cm</span>}
                    {p.height != null && <span>H: {p.height} cm</span>}
                    {p.weight != null && <span>W: {p.weight} kg</span>}
                  </div>
                </div>
              </>
            )}

            {/* Variations */}
            {p.variations && p.variations.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Variations</h4>
                  <div className="space-y-2">
                    {p.variations.map((v) => {
                      const photos = v.photos ?? [];
                      const primaryPhoto =
                        photos.find((ph) => ph.isPrimary) ?? photos[0];
                      const totalStock = getVariationTotal(v);
                      const attrLabel = getVariationAttributeDisplay(v);
                      return (
                        <div
                          key={v.id}
                          className="border rounded-lg p-3 space-y-2 bg-muted/30"
                        >
                          <div className="flex items-start gap-3">
                            {primaryPhoto?.photoUrl && (
                              <div className="relative w-16 h-16 rounded border overflow-hidden shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={primaryPhoto.photoUrl}
                                  alt={attrLabel || "Variation"}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">
                                {attrLabel !== "—" ? attrLabel : "Default"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Stock: {totalStock}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Discounts */}
            {p.discounts &&
              p.discounts.filter((d) => d.isActive).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Discounts</h4>
                    <div className="flex flex-wrap gap-2">
                      {p.discounts
                        .filter((d) => d.isActive)
                        .map((d) => (
                          <div
                            key={d.id}
                            className="border rounded p-2 bg-background text-sm"
                          >
                            <span className="font-medium">
                              {d.discountType?.name ?? "Unknown"}
                            </span>
                            <span className="text-muted-foreground ml-1">
                              — {d.discountPercentage}% off
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
