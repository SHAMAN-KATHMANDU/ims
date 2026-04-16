"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BlockNode, SiteLayoutScope } from "@repo/shared";
import {
  listSiteLayouts,
  getSiteLayout,
  upsertSiteLayoutDraft,
  publishSiteLayout,
  deleteSiteLayout,
  getSiteLayoutPreviewUrl,
  resetSiteLayoutFromTemplate,
} from "../services/site-layouts.service";

export const siteLayoutKeys = {
  all: ["site-layouts"] as const,
  list: () => [...siteLayoutKeys.all, "list"] as const,
  one: (scope: SiteLayoutScope, pageId?: string) =>
    [...siteLayoutKeys.all, "one", scope, pageId ?? ""] as const,
  previewUrl: (scope: SiteLayoutScope, pageId?: string) =>
    [...siteLayoutKeys.all, "previewUrl", scope, pageId ?? ""] as const,
};

export function useSiteLayouts() {
  return useQuery({
    queryKey: siteLayoutKeys.list(),
    queryFn: listSiteLayouts,
  });
}

export function useSiteLayout(scope: SiteLayoutScope, pageId?: string) {
  return useQuery({
    queryKey: siteLayoutKeys.one(scope, pageId),
    queryFn: () => getSiteLayout(scope, pageId),
  });
}

export function useUpsertSiteLayoutDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      scope: SiteLayoutScope;
      pageId?: string | null;
      blocks: BlockNode[];
    }) => upsertSiteLayoutDraft(input),
    onSuccess: (_row, variables) => {
      qc.invalidateQueries({ queryKey: siteLayoutKeys.all });
      qc.invalidateQueries({
        queryKey: siteLayoutKeys.one(
          variables.scope,
          variables.pageId ?? undefined,
        ),
      });
    },
  });
}

export function usePublishSiteLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { scope: SiteLayoutScope; pageId?: string }) =>
      publishSiteLayout(input.scope, input.pageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: siteLayoutKeys.all });
    },
  });
}

export function useDeleteSiteLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { scope: SiteLayoutScope; pageId?: string }) =>
      deleteSiteLayout(input.scope, input.pageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: siteLayoutKeys.all });
    },
  });
}

export function useSiteLayoutPreviewUrl(
  scope: SiteLayoutScope,
  pageId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: siteLayoutKeys.previewUrl(scope, pageId),
    queryFn: () => getSiteLayoutPreviewUrl(scope, pageId),
    // Previews are short-lived (30min) — refetch occasionally.
    staleTime: 15 * 60 * 1000,
    enabled,
  });
}

export function useResetSiteLayoutFromTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { scope: SiteLayoutScope; pageId?: string }) =>
      resetSiteLayoutFromTemplate(input.scope, input.pageId),
    onSuccess: (_row, variables) => {
      qc.invalidateQueries({ queryKey: siteLayoutKeys.all });
      qc.invalidateQueries({
        queryKey: siteLayoutKeys.one(
          variables.scope,
          variables.pageId ?? undefined,
        ),
      });
    },
  });
}
