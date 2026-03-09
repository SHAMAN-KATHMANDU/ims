/**
 * Factory for creating test category data.
 * Use in integration tests and repository/service tests.
 */

export interface CategoryOverrides {
  id?: string;
  tenantId?: string;
  name?: string;
  description?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
}

const DEFAULT_ID = "cat-00000000-0000-4000-8000-000000000001";

const defaultCategory = {
  id: DEFAULT_ID,
  tenantId: "tenant-1",
  name: "Electronics",
  description: "Electronics and gadgets",
  deletedAt: null,
  deletedBy: null,
  deleteReason: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

export function createCategory(overrides: CategoryOverrides = {}) {
  return {
    ...defaultCategory,
    ...overrides,
  };
}
