/**
 * Factory for creating test user data.
 * Use in integration tests and seed helpers.
 */

export interface UserOverrides {
  id?: string;
  tenantId?: string;
  username?: string;
  role?: string;
  password?: string;
}

const defaultUser = {
  id: "user-1",
  tenantId: "tenant-1",
  username: "admin",
  role: "admin",
  password: "hashed-password",
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function createUser(overrides: UserOverrides = {}) {
  return {
    ...defaultUser,
    ...overrides,
  };
}
