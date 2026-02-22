"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthUser, TenantInfo } from "@/utils/auth";

// ============================================
// Types
// ============================================

interface AuthState {
  // State
  user: AuthUser | null;
  tenant: TenantInfo | null;
  isHydrated: boolean;

  // Actions
  setAuth: (user: AuthUser, tenant?: TenantInfo | null) => void;
  setTenant: (tenant: TenantInfo) => void;
  clearAuth: () => void;
  setHydrated: (value: boolean) => void;
}

// ============================================
// Cookie Storage (for middleware access)
// ============================================

const cookieStorage = {
  getItem: (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    return match?.[2] ? decodeURIComponent(match[2]) : null;
  },
  setItem: (name: string, value: string): void => {
    if (typeof document === "undefined") return;
    // Set cookie with 7 day expiry, secure in production
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`;
  },
  removeItem: (name: string): void => {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=; path=/; max-age=0`;
  },
};

// ============================================
// Store
// ============================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      tenant: null,
      isHydrated: false,

      // Actions
      setAuth: (user, tenant = null) => {
        set({ user, tenant });
      },

      setTenant: (tenant) => {
        set({ tenant });
      },

      clearAuth: () => {
        set({ user: null, tenant: null });
      },

      setHydrated: (value) => {
        set({ isHydrated: value });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => cookieStorage),
      // Persist user and tenant only (tokens are HttpOnly cookies)
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
      }),
      // Handle hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    },
  ),
);

// ============================================
// Selectors (for optimized re-renders)
// ============================================

export const selectUser = (state: AuthState) => state.user;
export const selectTenant = (state: AuthState) => state.tenant;
export const selectIsAuthenticated = (state: AuthState) => !!state.user;
export const selectIsHydrated = (state: AuthState) => state.isHydrated;

// Derived selectors
export const selectUserRole = (state: AuthState) => state.user?.role ?? null;
export const selectIsAdmin = (state: AuthState) =>
  state.user?.role === "admin" || state.user?.role === "superAdmin";
export const selectIsSuperAdmin = (state: AuthState) =>
  state.user?.role === "superAdmin";
export const selectTenantSlug = (state: AuthState) =>
  state.tenant?.slug ?? null;
export const selectPlanTier = (state: AuthState) => state.tenant?.plan ?? null;
export const selectSubscriptionStatus = (state: AuthState) =>
  state.tenant?.subscriptionStatus ?? null;
