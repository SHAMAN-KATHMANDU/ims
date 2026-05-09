import { createError } from "@/middlewares/errorHandler";
import { logger } from "@/config/logger";
import {
  getPaginationParams,
  createPaginationResult,
} from "@/utils/pagination";
import { getTenantId } from "@/config/tenantContext";
import inventoryRepository from "./inventory.repository";
import type { AdjustInventoryDto, SetInventoryDto } from "./inventory.schema";
import automationService from "@/modules/automation/automation.service";

export class InventoryService {
  async getLocationInventory(
    locationId: string,
    rawQuery: Record<string, unknown>,
  ) {
    const tenantId = getTenantId();
    const { page, limit, search } = getPaginationParams(rawQuery);
    const categoryId = rawQuery.categoryId as string | undefined;
    const rawSortBy = (rawQuery.sortBy as string | undefined) || "name";
    const rawSortOrder = (rawQuery.sortOrder as string | undefined) || "asc";

    const sortBy = (
      ["name", "price", "createdAt"].includes(rawSortBy) ? rawSortBy : "name"
    ) as "name" | "price" | "createdAt";
    const sortOrder = (rawSortOrder === "desc" ? "desc" : "asc") as
      | "asc"
      | "desc";

    const location = await inventoryRepository.findLocationById(locationId);
    if (!location) throw createError("Location not found", 404);

    const { totalItems, inventory } =
      await inventoryRepository.getLocationInventory(tenantId, {
        locationId,
        page,
        limit,
        search: search || undefined,
        categoryId,
        sortBy,
        sortOrder,
      });

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

  async getProductStock(productId: string) {
    const tenantId = getTenantId();

    const product = await inventoryRepository.findProductById(productId);
    if (!product) throw createError("Product not found", 404);

    const inventory = await inventoryRepository.getProductStock(
      tenantId,
      productId,
    );

    const inventoryByLocation = inventory.reduce(
      (acc: Record<string, any>, item) => {
        const locId = item.location.id;
        if (!acc[locId]) {
          acc[locId] = {
            location: item.location,
            variations: [],
            totalQuantity: 0,
          };
        }
        acc[locId].variations.push({
          variationId: item.variation.id,
          imsCode: item.variation.product?.imsCode ?? "",
          subVariationId: item.subVariationId ?? undefined,
          subVariation: item.subVariation
            ? { id: item.subVariation.id, name: item.subVariation.name }
            : undefined,
          quantity: item.quantity,
        });
        acc[locId].totalQuantity += item.quantity;
        return acc;
      },
      {},
    );

    const totalStock = inventory.reduce((sum, item) => sum + item.quantity, 0);

    return {
      product: {
        id: product.id,
        imsCode: product.imsCode ?? "",
        name: product.name,
        category: product.category,
      },
      totalStock,
      inventoryByLocation: Object.values(inventoryByLocation),
    };
  }

  async adjustInventory(data: AdjustInventoryDto) {
    const location = await inventoryRepository.findLocationById(
      data.locationId,
    );
    if (!location) throw createError("Location not found", 404);

    const variation = await inventoryRepository.findVariationById(
      data.variationId,
    );
    if (!variation) throw createError("Product variation not found", 404);

    const subVariationId = data.subVariationId ?? null;
    if (subVariationId) {
      const subVar = await inventoryRepository.findSubVariation(
        subVariationId,
        data.variationId,
      );
      if (!subVar) {
        throw createError(
          "Sub-variation not found or does not belong to this variation",
          404,
        );
      }
    }

    const existing = await inventoryRepository.findInventoryByUniqueKey(
      data.locationId,
      data.variationId,
      subVariationId,
    );

    let inventory;
    let previousQuantity = 0;

    if (existing) {
      previousQuantity = existing.quantity;
      const newQuantity = existing.quantity + data.quantity;
      if (newQuantity < 0) {
        const err = createError(
          "Adjustment would result in negative inventory",
          400,
        ) as Error & { currentQuantity?: number; adjustmentAmount?: number };
        err.currentQuantity = existing.quantity;
        err.adjustmentAmount = data.quantity;
        throw err;
      }
      inventory = await inventoryRepository.updateInventoryQuantity(
        existing.id,
        newQuantity,
      );
    } else {
      if (data.quantity < 0) {
        throw createError(
          "Cannot create inventory with negative quantity",
          400,
        );
      }
      inventory = await inventoryRepository.createInventory(
        data.locationId,
        data.variationId,
        subVariationId,
        data.quantity,
      );
    }

    await automationService.syncLowStockSignal({
      tenantId: location.tenantId,
      locationId: data.locationId,
      variationId: data.variationId,
      subVariationId,
      reason: "inventory_adjustment",
    });

    await automationService
      .publishDomainEvent({
        tenantId: location.tenantId,
        eventName: "inventory.stock.adjusted",
        scopeType: "LOCATION",
        scopeId: data.locationId,
        entityType: "LOCATION_INVENTORY",
        entityId: inventory.id,
        dedupeKey: `inventory-adjusted:${inventory.id}:${inventory.quantity}:${data.quantity}`,
        payload: {
          locationId: data.locationId,
          locationName: location.name,
          variationId: data.variationId,
          subVariationId,
          previousQuantity,
          adjustmentAmount: data.quantity,
          newQuantity: inventory.quantity,
          reason: data.reason || "Manual adjustment",
        },
      })
      .catch((error) => {
        logger.error("Automation event publishing failed", undefined, {
          tenantId: location.tenantId,
          inventoryId: inventory.id,
          eventName: "inventory.stock.adjusted",
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return {
      locationId: data.locationId,
      locationName: location.name,
      product: variation.product,
      imsCode: variation.product.imsCode,
      subVariationId: inventory.subVariationId ?? undefined,
      previousQuantity,
      adjustmentAmount: data.quantity,
      newQuantity: inventory.quantity,
      reason: data.reason || "Manual adjustment",
    };
  }

  async setInventory(data: SetInventoryDto) {
    const location = await inventoryRepository.findLocationById(
      data.locationId,
    );
    if (!location) throw createError("Location not found", 404);

    const variation = await inventoryRepository.findVariationById(
      data.variationId,
    );
    if (!variation) throw createError("Product variation not found", 404);

    const subVariationId = data.subVariationId ?? null;
    if (subVariationId) {
      const subVar = await inventoryRepository.findSubVariation(
        subVariationId,
        data.variationId,
      );
      if (!subVar) {
        throw createError(
          "Sub-variation not found or does not belong to this variation",
          404,
        );
      }
    }

    const inventory = await inventoryRepository.upsertInventory(
      data.locationId,
      data.variationId,
      subVariationId,
      data.quantity,
    );

    await automationService.syncLowStockSignal({
      tenantId: location.tenantId,
      locationId: data.locationId,
      variationId: data.variationId,
      subVariationId,
      reason: "inventory_set",
    });

    await automationService
      .publishDomainEvent({
        tenantId: location.tenantId,
        eventName: "inventory.stock.set",
        scopeType: "LOCATION",
        scopeId: data.locationId,
        entityType: "LOCATION_INVENTORY",
        entityId: inventory.id,
        dedupeKey: `inventory-set:${inventory.id}:${inventory.quantity}`,
        payload: {
          locationId: data.locationId,
          locationName: location.name,
          variationId: data.variationId,
          subVariationId,
          quantity: inventory.quantity,
        },
      })
      .catch((error) => {
        logger.error("Automation event publishing failed", undefined, {
          tenantId: location.tenantId,
          inventoryId: inventory.id,
          eventName: "inventory.stock.set",
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return {
      id: inventory.id,
      locationId: data.locationId,
      locationName: location.name,
      product: variation.product,
      imsCode: variation.product.imsCode,
      subVariationId: inventory.subVariationId ?? undefined,
      quantity: inventory.quantity,
    };
  }

  async getInventorySummary() {
    const { locations, locationStats } =
      await inventoryRepository.getInventorySummary();

    const overallTotal = locationStats.reduce(
      (acc, loc) => ({
        totalItems: acc.totalItems + loc.totalItems,
        totalQuantity: acc.totalQuantity + loc.totalQuantity,
      }),
      { totalItems: 0, totalQuantity: 0 },
    );

    return {
      summary: {
        totalLocations: locations.length,
        ...overallTotal,
      },
      locationStats,
    };
  }
}

export default new InventoryService();
