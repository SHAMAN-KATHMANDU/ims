/**
 * Inventory service: summary by location (for dashboard).
 */

import * as repo from "./inventory.repository";

export async function getInventorySummary(tenantId: string) {
  const locations = await repo.findLocationsActiveWithCount(tenantId);

  const locationStats = await Promise.all(
    locations.map(async (location) => {
      const stats = await repo.aggregateLocationInventoryByLocation(
        location.id,
      );
      return {
        id: location.id,
        name: location.name,
        type: location.type,
        totalItems: stats._count,
        totalQuantity: Number(stats._sum?.quantity ?? 0),
      };
    }),
  );

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
