/**
 * Factory for creating test inventory data.
 * Use in integration tests for LocationInventory.
 */

export interface InventoryOverrides {
  id?: string;
  locationId?: string;
  variationId?: string;
  subVariationId?: string | null;
  quantity?: number;
}

const DEFAULT_ID = "inv-00000000-0000-4000-8000-000000000001";

const defaultInventory = {
  id: DEFAULT_ID,
  locationId: "loc-1",
  variationId: "var-1",
  subVariationId: null,
  quantity: 10,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

export function createInventory(overrides: InventoryOverrides = {}) {
  return {
    ...defaultInventory,
    ...overrides,
  };
}
