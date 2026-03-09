/**
 * Factory for creating test sale data.
 * Use in integration tests and repository/service tests.
 */

export interface SaleOverrides {
  id?: string;
  tenantId?: string;
  saleCode?: string;
  locationId?: string;
  memberId?: string | null;
  contactId?: string | null;
  subtotal?: number;
  discount?: number;
  total?: number;
  createdById?: string;
}

export interface SaleItemOverrides {
  variationId: string;
  subVariationId?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

const DEFAULT_SALE_ID = "sale-00000000-0000-4000-8000-000000000001";

const defaultSale = {
  id: DEFAULT_SALE_ID,
  tenantId: "tenant-1",
  saleCode: "SL-001",
  type: "GENERAL" as const,
  isCreditSale: false,
  locationId: "loc-1",
  memberId: null,
  contactId: null,
  subtotal: 100,
  discount: 0,
  total: 100,
  notes: null,
  createdById: "user-1",
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

export function createSale(overrides: SaleOverrides = {}) {
  return {
    ...defaultSale,
    ...overrides,
  };
}

export function createSaleItem(overrides: SaleItemOverrides) {
  return {
    subVariationId: null,
    totalMrp: overrides.unitPrice * overrides.quantity,
    discountPercent: 0,
    discountAmount: 0,
    ...overrides,
  };
}
