"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  login as loginApi,
  getCurrentUser,
  logout as logoutApi,
} from "@/services/authService";
import {
  useAuthStore,
  selectUser,
  selectToken,
  selectIsAuthenticated,
  selectIsHydrated,
} from "@/stores/auth-store";

// ============================================
// Types
// ============================================

interface LoginCredentials {
  username: string;
  password: string;
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
 * - Zustand store for client-side auth state (token, user cache)
 * - TanStack Query for server state (getCurrentUser, mutations)
 */
export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Zustand state (with selectors for performance)
  const user = useAuthStore(selectUser);
  const token = useAuthStore(selectToken);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isHydrated = useAuthStore(selectIsHydrated);

  // Zustand actions
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Query: Fetch current user (only when authenticated)
  const {
    data: currentUser,
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
      loginApi(credentials.username, credentials.password),
    onSuccess: ({ token, user }) => {
      // Update Zustand store
      setAuth(user, token);
      // Invalidate user query to refetch
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
      // Redirect
      router.push("/admin/dashboard");
      router.refresh();
    },
  });

  // Mutation: Logout
  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSettled: () => {
      // Always clear auth, even if API fails
      clearAuth();
      // Clear all queries
      queryClient.clear();
      // Redirect
      router.push("/login");
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
      setAuth(result.data, token!);
    }
    return result.data ?? null;
  }, [refetchUser, setAuth, token]);

  return {
    // State
    user: currentUser ?? user,
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
