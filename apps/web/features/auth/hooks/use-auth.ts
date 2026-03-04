"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getWorkspaceRoot } from "@/constants/routes";
import {
  login as loginApi,
  getCurrentUser,
  logout as logoutApi,
} from "../services/auth.service";
import {
  useAuthStore,
  selectUser,
  selectToken,
  selectTenant,
  selectIsAuthenticated,
  selectIsHydrated,
} from "@/store/auth-store";
import type { LoginCredentials } from "../types";

export const authKeys = {
  all: ["auth"] as const,
  user: () => [...authKeys.all, "user"] as const,
};

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const user = useAuthStore(selectUser);
  const token = useAuthStore(selectToken);
  const tenant = useAuthStore(selectTenant);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isHydrated = useAuthStore(selectIsHydrated);

  const setAuth = useAuthStore((s) => s.setAuth);
  const setTenant = useAuthStore((s) => s.setTenant);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const {
    data: currentUserData,
    isLoading: isLoadingUser,
    refetch: refetchUser,
  } = useQuery({
    queryKey: authKeys.user(),
    queryFn: getCurrentUser,
    enabled: isAuthenticated && isHydrated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

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

  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      router.push("/");
      router.refresh();
    },
  });

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
    if (result.data && token) {
      setAuth(result.data.user, token, result.data.tenant);
      if (result.data.tenant) {
        setTenant(result.data.tenant);
      }
    }
    return result.data?.user ?? null;
  }, [refetchUser, setAuth, setTenant, token]);

  return {
    user: currentUserData?.user ?? user,
    tenant: currentUserData?.tenant ?? tenant,
    isAuthenticated,
    isLoading: !isHydrated || isLoadingUser,
    isHydrated,
    login,
    logout,
    refreshUser,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
  };
}

export function useIsAuthenticated() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isHydrated = useAuthStore(selectIsHydrated);
  return { isAuthenticated, isHydrated };
}

export function useCurrentUser() {
  return useAuthStore(selectUser);
}

export function useTenant() {
  return useAuthStore(selectTenant);
}
