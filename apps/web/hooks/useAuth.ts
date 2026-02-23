"use client";

/**
 * Auth hook: Zustand store + TanStack Query for login/logout and current user.
 * Business logic and API calls live in authService; this hook wires store, query, and redirects.
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getWorkspaceRoot } from "@/config/routes";
import {
  login as loginApi,
  getCurrentUser,
  logout as logoutApi,
} from "@/services/authService";
import {
  useAuthStore,
  selectIsAuthenticated,
  selectUser,
  selectTenant,
  selectIsHydrated,
} from "@/stores/auth-store";

// ============================================
// Types
// ============================================

interface LoginCredentials {
  username: string;
  password: string;
  tenantSlug?: string;
  callbackUrl?: string;
}

// ============================================
// Query Keys
// ============================================

export const authKeys = {
  all: ["auth"] as const,
  user: () => [...authKeys.all, "user"] as const,
};

// ============================================
// Auth Hook
// ============================================

/**
 * Authentication hook
 *
 * Combines:
 * - Zustand store for client-side auth state (user cache, tenant)
 * - TanStack Query for server state (getCurrentUser, mutations)
 */
export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Zustand state (with selectors for performance)
  const user = useAuthStore(selectUser);
  const tenant = useAuthStore(selectTenant);
  const isHydrated = useAuthStore(selectIsHydrated);

  // Zustand actions
  const setAuth = useAuthStore((s) => s.setAuth);
  const setTenant = useAuthStore((s) => s.setTenant);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Query: fetch current user after hydration to recover token-backed sessions.
  const {
    data: currentUserData,
    isLoading: isLoadingUser,
    refetch: refetchUser,
  } = useQuery({
    queryKey: authKeys.user(),
    queryFn: getCurrentUser,
    enabled: isHydrated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  const resolvedUser = currentUserData?.user ?? user;
  const resolvedTenant = currentUserData?.tenant ?? tenant;
  const resolvedAuthenticated = !!resolvedUser;

  // Mutation: Login
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      loginApi(
        credentials.username,
        credentials.password,
        credentials.tenantSlug,
      ),
    onSuccess: ({ user, tenant }, variables) => {
      setAuth(user, tenant);
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
      const root = tenant?.slug
        ? getWorkspaceRoot(tenant.slug)
        : getWorkspaceRoot();
      const callbackPath = variables.callbackUrl?.trim();
      const safeCallback =
        callbackPath && callbackPath.startsWith("/") ? callbackPath : null;
      router.push(safeCallback ?? root);
      router.refresh();
    },
  });

  // Mutation: Logout
  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      router.push("/");
      router.refresh();
    },
  });

  // Wrapper functions for cleaner API
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      return loginMutation.mutateAsync(credentials);
    },
    [loginMutation],
  );

  const logout = useCallback(async () => {
    return logoutMutation.mutateAsync();
  }, [logoutMutation]);

  const refreshUser = useCallback(async () => {
    const result = await refetchUser();
    if (result.data) {
      setAuth(result.data.user, result.data.tenant);
      if (result.data.tenant) {
        setTenant(result.data.tenant);
      }
    }
    return result.data?.user ?? null;
  }, [refetchUser, setAuth, setTenant]);

  return {
    // State
    user: resolvedUser,
    tenant: resolvedTenant,
    isAuthenticated: resolvedAuthenticated,
    isLoading: !isHydrated || isLoadingUser,
    isHydrated,

    // Actions
    login,
    logout,
    refreshUser,

    // Mutation states (for UI feedback)
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
  };
}

// ============================================
// Convenience Hooks (for specific use cases)
// ============================================

/**
 * Hook for just checking auth status (optimized)
 */
export function useIsAuthenticated() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isHydrated = useAuthStore(selectIsHydrated);
  return { isAuthenticated, isHydrated };
}

/**
 * Hook for just getting user (optimized)
 */
export function useCurrentUser() {
  const user = useAuthStore(selectUser);
  return user;
}

/**
 * Hook for getting tenant info (optimized)
 */
export function useTenant() {
  const tenant = useAuthStore(selectTenant);
  return tenant;
}
