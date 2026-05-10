/**
 * Load draft + published layout for a (scope, pageId?) pair.
 *
 * `pageId` is required when scope === "page" (the row is keyed by both),
 * and ignored otherwise (chrome scopes always have pageId=null in the DB).
 */

import { useQuery } from "@tanstack/react-query";
import type { BlockNode, SiteLayoutScope } from "@repo/shared";
import { getSiteLayout } from "../../services/site-layouts.service";

export const siteLayoutKeys = {
  all: ["siteLayout"] as const,
  scope: (scope: SiteLayoutScope, pageId: string | null = null) =>
    [...siteLayoutKeys.all, scope, pageId] as const,
};

export interface SiteLayout {
  scope: SiteLayoutScope;
  draft: BlockNode[] | null;
  published: BlockNode[] | null;
  publishedAt: string | null;
}

export function useSiteLayoutQuery(
  scope: SiteLayoutScope,
  pageId: string | null = null,
) {
  return useQuery({
    queryKey: siteLayoutKeys.scope(scope, pageId),
    queryFn: () => getSiteLayout(scope, pageId ?? undefined),
    staleTime: 0,
  });
}
