/**
 * Low-stock and location filter for product list.
 * Builds Prisma variation filter for getAllProducts (location + lowStock branching).
 */

import type { Prisma } from "@prisma/client";

export const LOW_STOCK_THRESHOLD = 5;

export type VariationFilterParams = {
  locationId?: string;
  lowStock?: boolean;
  lowStockVariationIds: string[];
};

/**
 * Returns a Prisma ProductWhereInput.variations fragment for filtering by
 * location and/or low-stock variation IDs. Returns undefined when neither
 * locationId nor lowStock is applied (or lowStock is true but no IDs).
 */
export function buildVariationFilterForList(
  params: VariationFilterParams,
): Prisma.ProductWhereInput["variations"] | undefined {
  const { locationId, lowStock, lowStockVariationIds } = params;

  if (!locationId && !lowStock) return undefined;

  if (locationId && lowStock && lowStockVariationIds.length > 0) {
    return {
      some: {
        id: { in: lowStockVariationIds },
        locationInventory: {
          some: {
            locationId,
            quantity: { gt: 0 },
          },
        },
      },
    };
  }

  if (locationId) {
    return {
      some: {
        locationInventory: {
          some: {
            locationId,
            quantity: { gt: 0 },
          },
        },
      },
    };
  }

  if (lowStock && lowStockVariationIds.length > 0) {
    return {
      some: { id: { in: lowStockVariationIds } },
    };
  }

  if (lowStock) {
    return {
      some: { id: { in: [] } },
    };
  }

  return undefined;
}
