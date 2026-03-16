import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetTenants = vi.fn();
const mockCreateTenant = vi.fn();

vi.mock("../services/tenant.service", () => ({
  getTenants: () => mockGetTenants(),
  getTenantById: vi.fn(),
  createTenant: (...args: unknown[]) => mockCreateTenant(...args),
  updateTenant: vi.fn(),
  changeTenantPlan: vi.fn(),
  activateTenant: vi.fn(),
  deactivateTenant: vi.fn(),
  createTenantUser: vi.fn(),
  resetTenantUserPassword: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useTenants, useCreateTenant } from "./use-tenants";

describe("useTenants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenants.mockResolvedValue({ tenants: [] });
  });

  it("calls getTenants", async () => {
    const { result } = renderHook(() => useTenants(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetTenants).toHaveBeenCalled();
  });
});

describe("useCreateTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTenant.mockResolvedValue({ id: "t1", slug: "acme" });
  });

  it("calls createTenant on mutation", async () => {
    const createData = {
      name: "Acme",
      slug: "acme",
      adminUsername: "admin",
      adminPassword: "secret123",
    };
    const { result } = renderHook(() => useCreateTenant(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateTenant).toHaveBeenCalledWith(
      createData,
      expect.objectContaining({ client: expect.anything() }),
    );
  });
});
