"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTenantSiteConfig,
  enableTenantWebsite,
  disableTenantWebsite,
  getSiteTemplates,
  type TenantSiteConfig,
  type SiteTemplate,
} from "../services/site-platform.service";

export type { TenantSiteConfig, SiteTemplate };

export const tenantWebsiteKeys = {
  all: ["platform", "tenant-website"] as const,
  detail: (tenantId: string) =>
    [...tenantWebsiteKeys.all, "detail", tenantId] as const,
  templates: () => ["platform", "site-templates"] as const,
};

export function useSiteTemplates() {
  return useQuery({
    queryKey: tenantWebsiteKeys.templates(),
    queryFn: getSiteTemplates,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTenantSiteConfig(tenantId: string | null) {
  return useQuery({
    queryKey: tenantWebsiteKeys.detail(tenantId ?? ""),
    queryFn: () => getTenantSiteConfig(tenantId!),
    enabled: !!tenantId?.trim(),
    // A 404 here means "website not enabled yet" — treat that as data (null),
    // not an error, so the UI can render the "enable" CTA.
    retry: false,
  });
}

export function useEnableTenantWebsite(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateSlug?: string) =>
      enableTenantWebsite(tenantId, templateSlug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantWebsiteKeys.all });
      queryClient.invalidateQueries({
        queryKey: ["platform", "tenant-domains"],
      });
    },
  });
}

export function useDisableTenantWebsite(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => disableTenantWebsite(tenantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantWebsiteKeys.all });
    },
  });
}
