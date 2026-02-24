/**
 * Inventory service: location inventory list, product stock, adjust, set, summary.
 * Uses repository only; throws NotFoundError / DomainError for 404/400.
 */

import type { Prisma } from "@prisma/client";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import { NotFoundError, DomainError } from "@/shared/errors";
import * as repo from "./inventory.repository";

export type LocationInventoryQuery = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
};

export async function getLocationInventory(
  tenantId: string,
  locationId: string,
  query: LocationInventoryQuery,
) {
  const location = await repo.findLocationById(locationId, tenantId);
  if (!location) throw new NotFoundError("Location not found");

  const { page, limit, search } = getPaginationParams(
    query as Parameters<typeof getPaginationParams>[0],
  );
  const { categoryId } = query;

  const where: Prisma.LocationInventoryWhereInput = {
    locationId,
    quantity: { gt: 0 },
  };

  if (search) {
    where.variation = {
      OR: [
        { color: { contains: search, mode: "insensitive" } },
        {
          product: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { imsCode: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ],
    };
  }

  if (categoryId) {
    where.variation = {
      ...(where.variation as Prisma.ProductVariationWhereInput),
      product: { categoryId },
    };
  }

  const skip = (page - 1) * limit;

  const [totalItems, inventory] = await Promise.all([
    repo.countLocationInventory(where),
    repo.findManyLocationInventory(where, {
      skip,
      take: limit,
      orderBy: {
        variation: { product: { name: "asc" } },
      },
    }),
  ]);

  const result = createPaginationResult(inventory, totalItems, page, limit);
  return {
    location: {
      id: location.id,
      name: location.name,
      type: location.type,
    },
    ...result,
  };
}

export async function getProductStock(tenantId: string, productId: string) {
  const product = await repo.findProductById(productId, tenantId);
  if (!product) throw new NotFoundError("Product not found");

  const inventory = await repo.findLocationInventoryByProductId(productId);

  const inventoryByLocation = inventory.reduce<
    Record<
      string,
      {
        location: { id: string; name: string; type: string };
        variations: Array<{
          variationId: string;
          color: string;
          subVariationId?: string;
          subVariation?: { id: string; name: string };
          quantity: number;
        }>;
        totalQuantity: number;
      }
    >
  >((acc, item) => {
    const locationId = item.location.id;
    if (!acc[locationId]) {
      acc[locationId] = {
        location: item.location,
        variations: [],
        totalQuantity: 0,
      };
    }
    acc[locationId].variations.push({
      variationId: item.variation.id,
      color: item.variation.color,
      subVariationId: item.subVariationId ?? undefined,
      subVariation: item.subVariation
        ? { id: item.subVariation.id, name: item.subVariation.name }
        : undefined,
      quantity: item.quantity,
    });
    acc[locationId].totalQuantity += item.quantity;
    return acc;
  }, {});

  const totalStock = inventory.reduce((sum, item) => sum + item.quantity, 0);

  return {
    product: {
      id: product.id,
      imsCode: product.imsCode,
      name: product.name,
      category: product.category,
    },
    totalStock,
    inventoryByLocation: Object.values(inventoryByLocation),
  };
}

export type AdjustInventoryInput = {
  locationId: string;
  variationId: string;
  subVariationId?: string | null;
  quantity: number;
  reason?: string;
};

export async function adjustInventory(
  tenantId: string,
  input: AdjustInventoryInput,
) {
  const {
    locationId,
    variationId,
    subVariationId,
    quantity: adjustedQuantity,
    reason,
  } = input;

  const location = await repo.findLocationById(locationId, tenantId);
  if (!location) throw new NotFoundError("Location not found");

  const variation = await repo.findVariationById(variationId, tenantId);
  if (!variation) throw new NotFoundError("Product variation not found");

  if (subVariationId) {
    const subVar = await repo.findSubVariationByIdAndVariation(
      subVariationId,
      variationId,
    );
    if (!subVar) {
      throw new NotFoundError(
        "Sub-variation not found or does not belong to this variation",
      );
    }
  }

  const existingInventory = await repo.findUniqueLocationInventory(
    locationId,
    variationId,
    subVariationId ?? null,
  );

  let inventory;
  let previousQuantity = 0;

  if (existingInventory) {
    previousQuantity = existingInventory.quantity;
    const newQuantity = existingInventory.quantity + adjustedQuantity;
    if (newQuantity < 0) {
      throw new DomainError(
        400,
        "Adjustment would result in negative inventory",
        "NEGATIVE_INVENTORY",
      );
    }
    inventory = await repo.updateLocationInventory(existingInventory.id, {
      quantity: newQuantity,
    });
  } else {
    if (adjustedQuantity < 0) {
      throw new DomainError(
        400,
        "Cannot create inventory with negative quantity",
        "NEGATIVE_INVENTORY",
      );
    }
    inventory = await repo.createLocationInventory({
      locationId,
      variationId,
      subVariationId: subVariationId ?? null,
      quantity: adjustedQuantity,
    });
  }

  return {
    adjustment: {
      locationId,
      locationName: location.name,
      product: variation.product,
      color: variation.color,
      subVariationId: inventory.subVariationId ?? undefined,
      previousQuantity,
      adjustmentAmount: adjustedQuantity,
      newQuantity: inventory.quantity,
      reason: reason ?? "Manual adjustment",
    },
  };
}

export type SetInventoryInput = {
  locationId: string;
  variationId: string;
  subVariationId?: string | null;
  quantity: number;
};

export async function setInventory(tenantId: string, input: SetInventoryInput) {
  const {
    locationId,
    variationId,
    subVariationId,
    quantity: newQuantity,
  } = input;

  const location = await repo.findLocationById(locationId, tenantId);
  if (!location) throw new NotFoundError("Location not found");

  const variation = await repo.findVariationById(variationId, tenantId);
  if (!variation) throw new NotFoundError("Product variation not found");

  if (subVariationId) {
    const subVar = await repo.findSubVariationByIdAndVariation(
      subVariationId,
      variationId,
    );
    if (!subVar) {
      throw new NotFoundError(
        "Sub-variation not found or does not belong to this variation",
      );
    }
  }

  const inventory = await repo.upsertLocationInventory(
    {
      locationId_variationId_subVariationId: {
        locationId,
        variationId,
        subVariationId: subVariationId ?? null,
      },
    },
    { quantity: newQuantity },
    {
      locationId,
      variationId,
      subVariationId: subVariationId ?? null,
      quantity: newQuantity,
    },
  );

  return {
    inventory: {
      id: inventory.id,
      locationId,
      locationName: location.name,
      product: variation.product,
      color: variation.color,
      subVariationId: inventory.subVariationId ?? undefined,
      quantity: inventory.quantity,
    },
  };
}

export { getInventorySummary } from "./inventory.service.summary";
