"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ThemeTokens } from "@repo/shared";
import { getThemeTokens, updateThemeTokens } from "../services/theme.service";

const themeKeys = {
  all: ["theme"] as const,
  tokens: () => [...themeKeys.all, "tokens"] as const,
};

/**
 * Query hook for fetching theme tokens.
 */
export function useThemeTokens() {
  return useQuery({
    queryKey: themeKeys.tokens(),
    queryFn: () => getThemeTokens(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation hook for updating theme tokens.
 */
export function useUpdateThemeTokens() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (themeTokens: Partial<ThemeTokens>) =>
      updateThemeTokens(themeTokens),
    onSuccess: (updatedTheme: ThemeTokens | null) => {
      queryClient.setQueryData(themeKeys.tokens(), updatedTheme);
    },
  });
}
