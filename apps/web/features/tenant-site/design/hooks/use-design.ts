"use client";

import { useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSiteConfig,
  updateSiteConfig,
  type SiteConfig,
  type UpdateSiteConfigData,
} from "../../services/tenant-site.service";

const siteConfigKeys = {
  all: ["siteConfig"] as const,
  config: () => [...siteConfigKeys.all, "config"] as const,
};

export function useSiteConfig() {
  return useQuery({
    queryKey: siteConfigKeys.config(),
    queryFn: () => getSiteConfig(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSiteConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateSiteConfigData) => updateSiteConfig(data),
    onSuccess: (updatedConfig: SiteConfig) => {
      queryClient.setQueryData(siteConfigKeys.config(), updatedConfig);
    },
  });
}

/**
 * Debounced theme update hook.
 * Automatically saves theme changes after a short delay.
 */
export function useDebouncedThemeUpdate(delayMs: number = 800) {
  const updateMutation = useUpdateSiteConfig();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateTheme = useCallback(
    (themeTokens: Record<string, unknown>) => {
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        updateMutation.mutate({ themeTokens });
      }, delayMs);
    },
    [updateMutation, delayMs],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { updateTheme, isPending: updateMutation.isPending };
}
