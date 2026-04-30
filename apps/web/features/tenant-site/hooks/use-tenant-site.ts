"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSiteConfig,
  updateSiteConfig,
  listSiteTemplates,
  pickSiteTemplate,
  publishSite,
  unpublishSite,
  getSiteAnalytics,
  updateSiteAnalytics,
  type SiteConfig,
  type SiteTemplate,
  type UpdateSiteConfigData,
  type SiteAnalytics,
} from "../services/tenant-site.service";

export type { SiteConfig, SiteTemplate, UpdateSiteConfigData, SiteAnalytics };

export const tenantSiteKeys = {
  all: ["tenant-site"] as const,
  config: () => [...tenantSiteKeys.all, "config"] as const,
  templates: () => [...tenantSiteKeys.all, "templates"] as const,
  analytics: () => [...tenantSiteKeys.all, "analytics"] as const,
};

export function useSiteConfig() {
  return useQuery({
    queryKey: tenantSiteKeys.config(),
    queryFn: getSiteConfig,
    retry: false, // 403 (feature disabled) is a terminal state, don't retry
  });
}

export function useSiteTemplates() {
  return useQuery({
    queryKey: tenantSiteKeys.templates(),
    queryFn: listSiteTemplates,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSiteConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateSiteConfigData) => updateSiteConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantSiteKeys.config() });
    },
  });
}

export function usePickSiteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateSlug,
      resetBranding,
    }: {
      templateSlug: string;
      resetBranding: boolean;
    }) => pickSiteTemplate(templateSlug, resetBranding),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantSiteKeys.config() });
    },
  });
}

export function usePublishSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: publishSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantSiteKeys.config() });
    },
  });
}

export function useUnpublishSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unpublishSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantSiteKeys.config() });
    },
  });
}

export function useSiteAnalytics() {
  return useQuery({
    queryKey: tenantSiteKeys.analytics(),
    queryFn: getSiteAnalytics,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSiteAnalytics() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SiteAnalytics) => updateSiteAnalytics(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantSiteKeys.analytics() });
    },
  });
}
