import type { Product } from "@/hooks/useProduct";

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
  color?: string | null;
  imsCode?: string;
  attributes?: Array<{
    attributeType?: { name?: string; code?: string };
    attributeValue?: { value: string };
  }>;
};

/**
 * Get a single variation's attribute values as a display string, e.g. "Red M"
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
      .join(" ");
  }
  return variation.color?.trim() || variation.imsCode || "—";
}

/**
 * Get total stock for a single variation: sum of locationInventory when present, else stockQuantity
 */
export function getVariationTotal(variation: {
  stockQuantity?: number;
  locationInventory?: Array<{ quantity: number }>;
}): number {
  if (variation.locationInventory && variation.locationInventory.length > 0) {
    return variation.locationInventory.reduce((s, inv) => s + inv.quantity, 0);
  }
  return variation.stockQuantity ?? 0;
}

/** Variation with locationInventory items that have location.id */
type VariationWithLocationInv = {
  locationInventory?: Array<{
    quantity: number;
    location?: { id: string };
  }>;
  stockQuantity?: number;
};

/**
 * Get stock for a single variation at a specific location (for table row when location filter is set).
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
 * Get total stock quantity from all variations (uses locationInventory sum when available)
 */
export const getTotalStock = (product: Product): number => {
  if (!product.variations || product.variations.length === 0) return 0;
  return product.variations.reduce(
    (sum, variation) => sum + getVariationTotal(variation),
    0,
  );
};

/**
 * Get stock quantity at a specific location (sum across all variations' inventory at that location).
 * When a location is selected in the dropdown, use this so the Stock column shows actual count at that location.
 */
export function getStockAtLocation(
  product: Product,
  locationId: string,
): number {
  if (!product.variations || product.variations.length === 0) return 0;
  return product.variations.reduce((sum, variation) => {
    const inv = (variation as VariationWithLocationInv).locationInventory;
    if (!inv?.length) return sum;
    const atLocation = inv.find((i) => i.location?.id === locationId);
    return sum + (atLocation?.quantity ?? 0);
  }, 0);
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
      (
        product as { variations?: Array<{ imsCode?: string }> }
      ).variations?.some((v) => v.imsCode?.toLowerCase().includes(query)) ||
      product.name?.toLowerCase().includes(query) ||
      categoryName.includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.costPrice?.toString().includes(query) ||
      product.mrp?.toString().includes(query)
    );
  });
};
