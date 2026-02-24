/**
 * Discount strategy - replaces nested if/else for discount eligibility and selection.
 */

type SaleType = "GENERAL" | "MEMBER";

type ProductDiscountWithType = {
  valueType: string;
  value: unknown;
  discountType: { name: string };
};

function isEligibleForSaleType(
  d: ProductDiscountWithType,
  saleType: SaleType,
): boolean {
  const typeName = d.discountType.name.toLowerCase();
  if (saleType === "MEMBER") {
    return typeName.includes("member") || typeName.includes("non-member");
  }
  return typeName.includes("non-member") || typeName.includes("wholesale");
}

function compareDiscounts(
  a: ProductDiscountWithType,
  b: ProductDiscountWithType,
  itemSubtotal: number,
): number {
  const aIsSpecial = a.discountType.name.toLowerCase() === "special" ? 1 : 0;
  const bIsSpecial = b.discountType.name.toLowerCase() === "special" ? 1 : 0;
  if (aIsSpecial !== bIsSpecial) return bIsSpecial - aIsSpecial;
  const aValue =
    a.valueType === "FLAT"
      ? Number(a.value)
      : (Number(a.value) / 100) * itemSubtotal;
  const bValue =
    b.valueType === "FLAT"
      ? Number(b.value)
      : (Number(b.value) / 100) * itemSubtotal;
  return bValue - aValue;
}

export const discountStrategy = {
  selectEligibleDiscounts(
    discounts: ProductDiscountWithType[],
    saleType: SaleType,
    itemSubtotal: number,
  ): ProductDiscountWithType[] {
    if (!discounts?.length) return [];
    const eligible = discounts.filter((d) =>
      isEligibleForSaleType(d, saleType),
    );
    return eligible.sort((a, b) => compareDiscounts(a, b, itemSubtotal));
  },

  selectBaseDiscount(
    variation: {
      product: { discounts: ProductDiscountWithType[] };
    },
    saleType: SaleType,
    itemSubtotal: number,
  ): { discountAmount: number; discountPercent: number } {
    const activeDiscounts = variation.product?.discounts ?? [];
    const eligible = this.selectEligibleDiscounts(
      activeDiscounts,
      saleType,
      itemSubtotal,
    );
    const baseDiscount = eligible[0] ?? null;

    if (!baseDiscount) {
      return { discountAmount: 0, discountPercent: 0 };
    }

    if (baseDiscount.valueType === "FLAT") {
      return { discountAmount: Number(baseDiscount.value), discountPercent: 0 };
    }
    return {
      discountAmount: 0,
      discountPercent: Number(baseDiscount.value),
    };
  },
};
