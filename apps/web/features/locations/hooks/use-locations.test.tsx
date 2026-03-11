import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetLocations = vi.fn();
const mockCreateLocation = vi.fn();

const mockAuthState = vi.hoisted(() => ({
  isAuthenticated: true,
  userRole: "admin",
}));

vi.mock("../services/location.service", () => ({
  getLocations: (...args: unknown[]) => mockGetLocations(...args),
  getActiveLocations: vi.fn(),
  getLocationById: vi.fn(),
  createLocation: (...args: unknown[]) => mockCreateLocation(...args),
  updateLocation: vi.fn(),
  deleteLocation: vi.fn(),
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
}));

vi.mock("@/store/auth-store", () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => {
    const state = {
      user: { role: mockAuthState.userRole },
      token: "token",
      isAuthenticated: mockAuthState.isAuthenticated,
    };
    return typeof selector === "function"
      ? selector({
          ...state,
          token: mockAuthState.isAuthenticated ? "token" : null,
          user: { role: mockAuthState.userRole },
        })
      : state;
  },
  selectIsAuthenticated: (s: { token: unknown }) => !!s.token,
  selectUserRole: (s: { user?: { role?: string } }) => s.user?.role ?? null,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useLocationsPaginated, useCreateLocation } from "./use-locations";

describe("useLocationsPaginated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLocations.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, totalItems: 0, totalPages: 0 },
    });
  });

  it("calls getLocations with normalized params", async () => {
    const { result } = renderHook(
      () => useLocationsPaginated({ page: 1, limit: 10 }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockGetLocations).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 10,
      }),
    );
    expect(result.current.data?.data).toEqual([]);
  });
});

describe("useCreateLocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateLocation.mockResolvedValue({
      id: "loc1",
      name: "Warehouse A",
    });
  });

  it("calls createLocation on mutation", async () => {
    const createData = {
      name: "Warehouse A",
      type: "WAREHOUSE" as const,
    };

    const { result } = renderHook(() => useCreateLocation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(createData);
    });

    expect(mockCreateLocation).toHaveBeenCalledWith(createData);
  });
});
