"use client";

/**
 * Auth hook: Zustand store + TanStack Query for login/logout and current user.
 * Business logic and API calls live in authService; this hook wires store, query, and redirects.
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getWorkspaceRoot } from "@/constants/routes";
import {
  login as loginApi,
  getCurrentUser,
  logout as logoutApi,
} from "@/services/authService";
import {
  useAuthStore,
  selectUser,
  selectToken,
  selectTenant,
  selectIsAuthenticated,
  selectIsHydrated,
} from "@/store/auth-store";

// ============================================
// Types
// ============================================

interface LoginCredentials {
  username: string;
  password: string;
  tenantSlug?: string;
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
 * - Zustand store for client-side auth state (token, user cache, tenant)
 * - TanStack Query for server state (getCurrentUser, mutations)
 */
export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Zustand state (with selectors for performance)
  const user = useAuthStore(selectUser);
  const token = useAuthStore(selectToken);
  const tenant = useAuthStore(selectTenant);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isHydrated = useAuthStore(selectIsHydrated);

  // Zustand actions
  const setAuth = useAuthStore((s) => s.setAuth);
  const setTenant = useAuthStore((s) => s.setTenant);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Query: Fetch current user (only when authenticated)
  const {
    data: currentUserData,
    isLoading: isLoadingUser,
    refetch: refetchUser,
  } = useQuery({
    queryKey: authKeys.user(),
    queryFn: getCurrentUser,
    enabled: isAuthenticated && isHydrated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Mutation: Login
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      loginApi(
        credentials.username,
        credentials.password,
        credentials.tenantSlug,
      ),
    onSuccess: ({ token, user, tenant }) => {
      setAuth(user, token, tenant);
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
      const root = tenant?.slug
        ? getWorkspaceRoot(tenant.slug)
        : getWorkspaceRoot();
      router.push(root);
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
      setAuth(result.data.user, token!, result.data.tenant);
      if (result.data.tenant) {
        setTenant(result.data.tenant);
      }
    }
    return result.data?.user ?? null;
  }, [refetchUser, setAuth, setTenant, token]);

  return {
    // State
    user: currentUserData?.user ?? user,
    tenant: currentUserData?.tenant ?? tenant,
    isAuthenticated,
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
