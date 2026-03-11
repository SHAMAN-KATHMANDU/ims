import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockGetDashboardAdminSummary = vi.fn();
const mockGetPlatformStats = vi.fn();

vi.mock("../services/dashboard.service", () => ({
  getDashboardUserSummary: vi.fn(),
  getDashboardAdminSummary: () => mockGetDashboardAdminSummary(),
  getDashboardSuperAdminSummary: vi.fn(),
  DASHBOARD_STALE_TIME_MS: 60000,
}));

vi.mock("@/features/tenants", () => ({
  getPlatformStats: () => mockGetPlatformStats(),
}));

vi.mock("@/store/auth-store", () => ({
  useAuthStore: (selector: (s: { user?: { role?: string } }) => unknown) => {
    const state = { user: { role: "admin" } };
    return typeof selector === "function" ? selector(state) : state;
  },
  selectUserRole: (s: { user?: { role?: string } }) => s.user?.role ?? null,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useDashboardAdminSummary } from "./use-dashboard";

describe("useDashboardAdminSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDashboardAdminSummary.mockResolvedValue({ sales: 0, revenue: 0 });
  });

  it("calls getDashboardAdminSummary when role is admin", async () => {
    const { result } = renderHook(() => useDashboardAdminSummary(), {
      wrapper,
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(mockGetDashboardAdminSummary).toHaveBeenCalled();
  });
});
