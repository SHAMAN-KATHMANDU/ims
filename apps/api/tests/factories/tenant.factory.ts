/**
 * Factory for creating test tenant data.
 * Use in integration tests and seed helpers.
 */

export interface TenantOverrides {
  id?: string;
  slug?: string;
  name?: string;
  isActive?: boolean;
  plan?: string;
  subscriptionStatus?: string;
}

const defaultTenant = {
  id: "tenant-1",
  slug: "acme",
  name: "Acme Corp",
  isActive: true,
  plan: "STARTER",
  subscriptionStatus: "ACTIVE",
  planExpiresAt: null,
  trialEndsAt: null,
};

export function createTenant(overrides: TenantOverrides = {}) {
  return {
    ...defaultTenant,
    ...overrides,
  };
}
