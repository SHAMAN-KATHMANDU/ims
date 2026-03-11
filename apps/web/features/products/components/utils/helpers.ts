import type { Product } from "@/features/products";

/**
 * Calculate discounted price from MRP and discount percentage
 */
export const calculateDiscountedPrice = (
  mrp: number,
  discountPercentage: number,
): number => {
  return mrp - (mrp * discountPercentage) / 100;
};

/** Variation with optional EAV attributes (attributeValue.value) for display */
type VariationWithAttributes = {
  attributes?: Array<{
    attributeType?: { name?: string; code?: string };
    attributeValue?: { value: string };
  }>;
};

/**
 * Get a single variation's display label from attributes, e.g. "Red M", or "—" if none
 */
export function getVariationAttributeDisplay(
  variation: VariationWithAttributes,
): string {
  const attrs = variation.attributes?.filter(
    (a) =>
      a.attributeValue?.value != null && a.attributeValue.value.trim() !== "",
  );
  if (attrs?.length) {
    return attrs
      .map((a) => (a.attributeValue as { value: string }).value.trim())
      .join(" / ");
  }
  return "—";
}

/** Variation shape with optional locationInventory from the list API */
type VariationWithLocationInv = {
  stockQuantity?: number;
  locationInventory?: Array<{
    quantity: number;
    location?: { id: string; name?: string; type?: string };
  }>;
};

/**
 * Total stock for one variation across all locations.
 * Uses locationInventory (the real per-location rows) when present; falls back to stockQuantity.
 */
export function getVariationTotal(variation: VariationWithLocationInv): number {
  if (variation.locationInventory && variation.locationInventory.length > 0) {
    return variation.locationInventory.reduce((s, inv) => s + inv.quantity, 0);
  }
  return variation.stockQuantity ?? 0;
}

/**
 * Stock for one variation at a specific location.
 */
export function getStockForVariationAtLocation(
  variation: VariationWithLocationInv,
  locationId: string,
): number {
  const inv = variation.locationInventory;
  if (!inv?.length) return variation.stockQuantity ?? 0;
  const atLocation = inv.find((i) => i.location?.id === locationId);
  return atLocation?.quantity ?? 0;
}

/**
 * Total stock for a product across all variations and all locations.
 */
export const getTotalStock = (product: Product): number => {
  if (!product.variations || product.variations.length === 0) return 0;
  return product.variations.reduce(
    (sum, variation) => sum + getVariationTotal(variation),
    0,
  );
};

/**
 * Stock for a product at one specific location (sum across all variations).
 */
export function getStockAtLocation(
  product: Product,
  locationId: string,
): number {
  if (!product.variations || product.variations.length === 0) return 0;
  return product.variations.reduce((sum, variation) => {
    return sum + getStockForVariationAtLocation(variation, locationId);
  }, 0);
}

/**
 * Extract the unique locations that actually have inventory for a variation.
 */
export function getLocationsForVariation(
  variation: VariationWithLocationInv,
): Array<{ id: string; name: string; type: string }> {
  if (!variation.locationInventory?.length) return [];
  const seen = new Set<string>();
  const result: Array<{ id: string; name: string; type: string }> = [];
  for (const inv of variation.locationInventory) {
    if (inv.location?.id && !seen.has(inv.location.id)) {
      seen.add(inv.location.id);
      result.push({
        id: inv.location.id,
        name: inv.location.name ?? "Unknown",
        type: inv.location.type ?? "UNKNOWN",
      });
    }
  }
  return result;
}

/**
 * Get discounted prices for all discount types
 */
export const getDiscountedPrices = (product: Product) => {
  const discounts = product.discounts || [];
  const prices: Record<string, { percentage: number; price: number }> = {};

  discounts.forEach((discount) => {
    if (discount.isActive && discount.discountType?.name) {
      const typeName = discount.discountType.name.toLowerCase();
      prices[typeName] = {
        percentage: discount.discountPercentage,
        price: calculateDiscountedPrice(
          product.mrp,
          discount.discountPercentage,
        ),
      };
    }
  });

  return prices;
};

/**
 * Get category name from product or categories list
 */
export const getCategoryName = (
  id: string,
  product?: Product,
  categories?: Array<{ id: string; name: string }>,
) => {
  // First check if product has category object
  if (product?.category?.name) {
    return product.category.name;
  }
  // Fallback to categories list
  return categories?.find((c) => c.id === id)?.name || "Unknown";
};

/**
 * Filter products by search query
 */
export const filterProducts = (
  products: Product[],
  searchQuery: string,
  getCategoryNameFn: (id: string, product?: Product) => string,
) => {
  if (!searchQuery.trim()) return products;

  const query = searchQuery.toLowerCase().trim();

  return products.filter((product) => {
    const categoryName = getCategoryNameFn(
      product.categoryId,
      product,
    ).toLowerCase();

    return (
      (product as { imsCode?: string }).imsCode
        ?.toLowerCase()
        .includes(query) ||
      product.name?.toLowerCase().includes(query) ||
      categoryName.includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.costPrice?.toString().includes(query) ||
      product.mrp?.toString().includes(query)
    );
  });
};
