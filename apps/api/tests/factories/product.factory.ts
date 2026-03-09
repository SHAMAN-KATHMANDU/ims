/**
 * Factory for creating test product data.
 * Use in integration tests and repository/service tests.
 */

export interface ProductOverrides {
  id?: string;
  tenantId?: string;
  imsCode?: string;
  name?: string;
  categoryId?: string;
  subCategory?: string | null;
  subCategoryId?: string | null;
  description?: string | null;
  costPrice?: number;
  mrp?: number;
  finalSp?: number;
  createdById?: string;
  vendorId?: string | null;
}

const DEFAULT_ID = "prod-00000000-0000-4000-8000-000000000001";

const defaultProduct = {
  id: DEFAULT_ID,
  tenantId: "tenant-1",
  imsCode: "PRD-001",
  name: "Test Product",
  categoryId: "cat-00000000-0000-4000-8000-000000000001",
  subCategory: null,
  subCategoryId: null,
  description: null,
  costPrice: 50,
  mrp: 100,
  finalSp: 100,
  createdById: "user-1",
  vendorId: null,
  dateCreated: new Date("2026-01-01T00:00:00Z"),
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

export function createProduct(overrides: ProductOverrides = {}) {
  return {
    ...defaultProduct,
    ...overrides,
  };
}
