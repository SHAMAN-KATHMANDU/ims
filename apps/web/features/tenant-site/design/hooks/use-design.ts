"use client";

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
