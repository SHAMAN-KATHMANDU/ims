"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProduct } from "../../hooks/use-products";
import {
  calculateDiscountedPrice,
  getVariationAttributeDisplay,
  getVariationTotal,
} from "../utils/helpers";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/features/products";
import { Package, Ruler, FileText, Layers, Tag, Pencil } from "lucide-react";

interface ProductDetailSheetProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (product: Product) => void;
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      <Icon className="size-3.5" aria-hidden />
      {children}
    </h3>
  );
}

export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
  onEdit,
}: ProductDetailSheetProps) {
  const productId = open && product?.id ? product.id : "";
  const { data: fullProduct, isLoading } = useProduct(productId);
  const p = fullProduct ?? product;

  if (!p) return null;

  const firstVariationPhoto =
    p.variations?.flatMap((v) => v.photos ?? []).find((ph) => ph.isPrimary) ??
    p.variations?.[0]?.photos?.[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        {/* Header with optional hero image */}
        <div className="shrink-0 border-b bg-muted/20">
          {firstVariationPhoto?.photoUrl && (
            <div className="relative aspect-video w-full overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={firstVariationPhoto.photoUrl}
                alt=""
                className="h-full w-full object-cover object-center"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}
          <SheetHeader className="space-y-2 px-5 pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">
                {p.imsCode}
              </Badge>
              {p.category && (
                <Badge variant="outline" className="text-xs">
                  {p.category.name}
                </Badge>
              )}
            </div>
            <SheetTitle className="text-left text-lg leading-tight">
              {p.name}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Product code: {p.imsCode}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading && !fullProduct ? (
            <div
              className="space-y-6 p-5"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <span className="sr-only">Loading product details…</span>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          ) : (
            <div className="space-y-6 p-5">
              {/* Key info */}
              <div className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs text-muted-foreground">MRP</span>
                  <span className="text-xl font-semibold tabular-nums">
                    {formatCurrency(Number(p.mrp))}
                  </span>
                </div>
              </div>

              {/* Description */}
              {p.description && (
                <section className="space-y-2">
                  <SectionTitle icon={FileText}>Description</SectionTitle>
                  <p className="rounded-lg border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground whitespace-pre-wrap">
                    {p.description}
                  </p>
                </section>
              )}

              {/* Dimensions */}
              {(p.length != null ||
                p.breadth != null ||
                p.height != null ||
                p.weight != null) && (
                <section className="space-y-2">
                  <SectionTitle icon={Ruler}>Dimensions</SectionTitle>
                  <div className="flex flex-wrap gap-3 rounded-lg border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
                    {p.length != null && (
                      <span>
                        L{" "}
                        <span className="font-medium text-foreground">
                          {p.length}
                        </span>{" "}
                        cm
                      </span>
                    )}
                    {p.breadth != null && (
                      <span>
                        B{" "}
                        <span className="font-medium text-foreground">
                          {p.breadth}
                        </span>{" "}
                        cm
                      </span>
                    )}
                    {p.height != null && (
                      <span>
                        H{" "}
                        <span className="font-medium text-foreground">
                          {p.height}
                        </span>{" "}
                        cm
                      </span>
                    )}
                    {p.weight != null && (
                      <span>
                        W{" "}
                        <span className="font-medium text-foreground">
                          {p.weight}
                        </span>{" "}
                        kg
                      </span>
                    )}
                  </div>
                </section>
              )}

              {/* Variations */}
              {p.variations && p.variations.length > 0 && (
                <section className="space-y-3">
                  <SectionTitle icon={Layers}>
                    Variations ({p.variations.length})
                  </SectionTitle>
                  <ul className="space-y-2">
                    {p.variations.map((v) => {
                      const photos = v.photos ?? [];
                      const primaryPhoto =
                        photos.find((ph) => ph.isPrimary) ?? photos[0];
                      const totalStock = getVariationTotal(v);
                      const attrLabel = getVariationAttributeDisplay(v);
                      return (
                        <li
                          key={v.id}
                          className="flex items-center gap-3 rounded-lg border bg-card p-3"
                        >
                          {primaryPhoto?.photoUrl ? (
                            <div className="relative size-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={primaryPhoto.photoUrl}
                                alt=""
                                className="size-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              className="flex size-14 shrink-0 items-center justify-center rounded-md border bg-muted"
                              aria-hidden
                            >
                              <Package
                                className="size-6 text-muted-foreground"
                                aria-hidden="true"
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {attrLabel !== "—" ? attrLabel : "Default"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Stock:{" "}
                              <span className="tabular-nums">{totalStock}</span>
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* Discounts */}
              {p.discounts &&
                p.discounts.filter((d) => d.isActive).length > 0 && (
                  <section className="space-y-2">
                    <SectionTitle icon={Tag}>Active discounts</SectionTitle>
                    <div className="flex flex-wrap gap-2">
                      {p.discounts
                        .filter((d) => d.isActive)
                        .map((d) => (
                          <Badge
                            key={d.id}
                            variant="secondary"
                            className="font-normal"
                          >
                            {d.discountType?.name ?? "Unknown"}{" "}
                            <span className="opacity-80">
                              {d.discountPercentage}% off (
                              {formatCurrency(
                                calculateDiscountedPrice(
                                  Number(p.mrp),
                                  d.discountPercentage,
                                ),
                              )}
                              )
                            </span>
                          </Badge>
                        ))}
                    </div>
                  </section>
                )}
            </div>
          )}
        </div>

        {/* Footer with Edit CTA */}
        {onEdit && !isLoading && (
          <SheetFooter className="shrink-0 border-t bg-muted/20 px-5 py-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => onEdit(p)}
              aria-label="Edit product"
            >
              <Pencil className="mr-2 size-4" aria-hidden />
              Edit product
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
