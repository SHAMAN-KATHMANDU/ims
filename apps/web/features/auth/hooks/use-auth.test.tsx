import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClientWrapper } from "@/test-utils/query-client-wrapper";

const mockAuthFns = vi.hoisted(() => ({
  setAuth: vi.fn(),
  clearAuth: vi.fn(),
}));
const mockNav = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
const mockLogin = vi.fn();
const mockLogout = vi.fn();

vi.mock("../services/auth.service", () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  getCurrentUser: vi.fn().mockResolvedValue(null),
  logout: (...args: unknown[]) => mockLogout(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockNav,
}));

vi.mock("@/store/auth-store", () => ({
  useAuthStore: (selector: (s: unknown) => unknown) => {
    const state = {
      user: null,
      token: null,
      tenant: null,
      isHydrated: true,
      setAuth: mockAuthFns.setAuth,
      setTenant: vi.fn(),
      clearAuth: mockAuthFns.clearAuth,
      setHydrated: vi.fn(),
    };
    return typeof selector === "function" ? selector(state) : state;
  },
  selectUser: (s: { user: unknown }) => s.user,
  selectToken: (s: { token: unknown }) => s.token,
  selectTenant: (s: { tenant: unknown }) => s.tenant,
  selectIsAuthenticated: (s: { token: unknown }) => !!s.token,
  selectIsHydrated: (s: { isHydrated: unknown }) => s.isHydrated,
  selectSetAuth: (s: { setAuth: unknown }) => s.setAuth,
  selectSetTenant: (s: { setTenant: unknown }) => s.setTenant,
  selectRefreshTenant: (s: { refreshTenant: unknown }) => s.refreshTenant,
  selectClearAuth: (s: { clearAuth: unknown }) => s.clearAuth,
  selectSetHydrated: (s: { setHydrated: unknown }) => s.setHydrated,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientWrapper>{children}</QueryClientWrapper>
);

import { useAuth, useIsAuthenticated } from "./use-auth";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial state when not authenticated", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.tenant).toBeNull();
  });

  it("login mutation calls auth service and navigates on success", async () => {
    const loginResponse = {
      token: "jwt-token",
      refreshToken: "refresh-jwt-token",
      user: { id: "u1", tenantId: "t1", username: "user", role: "admin" },
      tenant: { id: "t1", slug: "acme", name: "Acme", plan: "STARTER" },
    };
    mockLogin.mockResolvedValue(loginResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({
        username: "user",
        password: "pass",
        tenantSlug: "acme",
      });
    });

    expect(mockLogin).toHaveBeenCalledWith("user", "pass", "acme");
    expect(mockAuthFns.setAuth).toHaveBeenCalledWith(
      loginResponse.user,
      loginResponse.token,
      loginResponse.tenant,
      loginResponse.refreshToken,
    );
    expect(mockNav.push).toHaveBeenCalledWith("/acme");
  });

  it("logout mutation clears auth and navigates", async () => {
    mockLogout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(mockAuthFns.clearAuth).toHaveBeenCalled();
    expect(mockNav.push).toHaveBeenCalledWith("/");
  });
});

describe("useIsAuthenticated", () => {
  it("returns isAuthenticated and isHydrated from store", () => {
    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });

    expect(result.current).toEqual({
      isAuthenticated: false,
      isHydrated: true,
    });
  });
});
