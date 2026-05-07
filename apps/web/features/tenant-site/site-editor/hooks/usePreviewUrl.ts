/**
 * usePreviewUrl — mints a token-gated preview URL for the canvas iframe.
 *
 * The tenant-site `/preview/site/[scope]` route is auth-gated by an HMAC
 * site-scope token (apps/api/src/modules/site-preview/preview-token.ts).
 * Without the token, the route falls through to a 404 page. This hook
 * fetches a fresh preview URL from the API and refreshes it whenever
 * the scope or pageId changes.
 *
 * Tokens TTL at 30 minutes server-side; we re-fetch on a 25-minute
 * cadence to stay ahead of expiry without surfacing 404 toasts.
 */

import { useQuery } from "@tanstack/react-query";
import type { SiteLayoutScope } from "@repo/shared";
import { getSiteLayoutPreviewUrl } from "../../services/site-layouts.service";

export const previewUrlKeys = {
  all: ["site-preview-url"] as const,
  scope: (scope: SiteLayoutScope, pageId?: string) =>
    [...previewUrlKeys.all, scope, pageId ?? null] as const,
};

const REFRESH_INTERVAL_MS = 25 * 60 * 1000;

export function usePreviewUrl(scope: SiteLayoutScope, pageId?: string) {
  return useQuery({
    queryKey: previewUrlKeys.scope(scope, pageId),
    queryFn: () => getSiteLayoutPreviewUrl(scope, pageId),
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });
}
