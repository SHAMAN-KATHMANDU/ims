/**
 * Load draft + published layout for a scope.
 */

import { useQuery } from "@tanstack/react-query";
import type { BlockNode, SiteLayoutScope } from "@repo/shared";
import { getSiteLayout } from "../../services/site-layouts.service";

export const siteLayoutKeys = {
  all: ["siteLayout"] as const,
  scope: (scope: SiteLayoutScope) => [...siteLayoutKeys.all, scope] as const,
};

export interface SiteLayout {
  scope: SiteLayoutScope;
  draft: BlockNode[] | null;
  published: BlockNode[] | null;
  publishedAt: string | null;
}

export function useSiteLayoutQuery(scope: SiteLayoutScope) {
  return useQuery({
    queryKey: siteLayoutKeys.scope(scope),
    queryFn: () => getSiteLayout(scope),
    staleTime: 0,
  });
}
