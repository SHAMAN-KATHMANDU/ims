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
import { siteLayoutKeys } from "./use-site-layouts";

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
      // Picking a template overwrites every scope's draft+published layout
      // server-side, so invalidating only the config query left the editor
      // (and the preview iframe it owns) showing stale block trees and a
      // stale theme. Invalidate everything tenant-site related so the next
      // render fetches fresh data, and emit a window event the canvas can
      // listen to for forcing an iframe reload.
      queryClient.invalidateQueries({ queryKey: tenantSiteKeys.all });
      queryClient.invalidateQueries({ queryKey: siteLayoutKeys.all });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("site-template-picked"));
      }
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
