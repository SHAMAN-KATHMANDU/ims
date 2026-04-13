/**
 * Typed fetch layer for the tenant-site renderer.
 *
 * All calls go to /api/v1/public/* (unauthenticated) with the customer's
 * Host header forwarded so the API's resolveTenantFromHostname middleware
 * auto-scopes queries to the right tenant.
 *
 * Responses are tagged with `tenant:${tenantId}:...` so the API can
 * revalidate specific cache entries when tenants publish or update content.
 */

const API = process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";

type FetchOptions = {
  host: string;
  tenantId: string;
  tags: string[];
  // Revalidate window in seconds. Cache tags are the primary freshness
  // mechanism; this is a safety floor in case a revalidation call is lost.
  revalidate?: number;
};

async function publicFetch<T>(
  path: string,
  opts: FetchOptions,
): Promise<T | null> {
  const url = `${API}${path}`;
  try {
    const res = await fetch(url, {
      headers: {
        // Forward the customer-facing host so the API middleware resolves
        // the correct tenant via req.hostname.
        host: opts.host,
        "x-forwarded-host": opts.host,
      },
      next: {
        revalidate: opts.revalidate ?? 300,
        tags: opts.tags,
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      // Log on the server and treat as empty state.
      // eslint-disable-next-line no-console
      console.error(
        `[tenant-site] ${path} returned ${res.status} for host=${opts.host}`,
      );
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[tenant-site] ${path} threw`, error);
    return null;
  }
}

// ============================================================================
// Types (mirror of apps/api public-site response shapes)
// ============================================================================

export type SiteTemplateSlug =
  | "minimal"
  | "standard"
  | "luxury"
  | "boutique"
  | (string & {});

export interface PublicTemplate {
  id: string;
  slug: SiteTemplateSlug;
  name: string;
  description: string | null;
  tier: "MINIMAL" | "STANDARD" | "LUXURY" | "BOUTIQUE";
  previewImageUrl: string | null;
  defaultBranding: Record<string, unknown> | null;
  defaultSections: Record<string, unknown> | null;
}

export interface PublicSite {
  branding: Record<string, unknown> | null;
  contact: Record<string, unknown> | null;
  features: Record<string, unknown> | null;
  seo: Record<string, unknown> | null;
  template: PublicTemplate | null;
}

export interface PublicCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  imsCode: string;
  mrp: string;
  finalSp: string;
  categoryId: string;
  subCategory: string | null;
  dateCreated: string;
  category?: { id: string; name: string } | null;
}

export interface PublicProductList {
  products: PublicProduct[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================================
// Typed wrappers — what pages import
// ============================================================================

export function getSite(host: string, tenantId: string) {
  return publicFetch<{ site: PublicSite } | PublicSite | null>("/public/site", {
    host,
    tenantId,
    tags: [`tenant:${tenantId}:site`],
  }).then((resp) => {
    if (!resp) return null;
    // API returns { message: "OK", site: {...} }
    return "site" in (resp as Record<string, unknown>)
      ? (resp as { site: PublicSite }).site
      : (resp as PublicSite);
  });
}

export function getProducts(
  host: string,
  tenantId: string,
  query: { page?: number; limit?: number; categoryId?: string } = {},
) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.categoryId) params.set("categoryId", query.categoryId);
  const suffix = params.toString() ? `?${params.toString()}` : "";

  return publicFetch<PublicProductList>(`/public/products${suffix}`, {
    host,
    tenantId,
    tags: [`tenant:${tenantId}:products`],
  });
}

export function getProduct(host: string, tenantId: string, id: string) {
  return publicFetch<{ product: PublicProduct } | PublicProduct>(
    `/public/products/${id}`,
    {
      host,
      tenantId,
      tags: [`tenant:${tenantId}:product:${id}`, `tenant:${tenantId}:products`],
    },
  ).then((resp) => {
    if (!resp) return null;
    return "product" in (resp as Record<string, unknown>)
      ? (resp as { product: PublicProduct }).product
      : (resp as PublicProduct);
  });
}

export function getCategories(host: string, tenantId: string) {
  return publicFetch<{ categories: PublicCategory[] } | PublicCategory[]>(
    "/public/categories",
    {
      host,
      tenantId,
      tags: [`tenant:${tenantId}:categories`],
    },
  ).then((resp) => {
    if (!resp) return [];
    return Array.isArray(resp)
      ? resp
      : ((resp as { categories: PublicCategory[] }).categories ?? []);
  });
}
