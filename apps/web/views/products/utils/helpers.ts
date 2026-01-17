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

/**
 * Get total stock quantity from all variations
 */
export const getTotalStock = (product: Product): number => {
  if (!product.variations || product.variations.length === 0) return 0;
  return product.variations.reduce(
    (sum, variation) => sum + (variation.stockQuantity || 0),
    0,
  );
};

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
      product.imsCode?.toLowerCase().includes(query) ||
      product.name?.toLowerCase().includes(query) ||
      categoryName.includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.costPrice?.toString().includes(query) ||
      product.mrp?.toString().includes(query)
    );
  });
};
