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
  // Phase A — original four
  | "minimal"
  | "standard"
  | "luxury"
  | "boutique"
  // Phase C.4 — 10 new bespoke layouts
  | "editorial"
  | "organic"
  | "dark"
  | "brutalist"
  | "zen"
  | "coastal"
  | "apothecary"
  | "retro"
  | "artisan"
  | "gallery"
  | (string & {});

export interface PublicTemplate {
  id: string;
  slug: SiteTemplateSlug;
  name: string;
  description: string | null;
  /** Free-text grouping: "minimal" | "editorial" | "dark" | ... */
  category: string | null;
  previewImageUrl: string | null;
  defaultBranding: Record<string, unknown> | null;
  defaultSections: Record<string, unknown> | null;
  defaultPages: Record<string, unknown> | null;
}

export interface PublicSite {
  branding: Record<string, unknown> | null;
  contact: Record<string, unknown> | null;
  features: Record<string, unknown> | null;
  seo: Record<string, unknown> | null;
  /** Structured design tokens (Phase 7+). Preferred over branding when set. */
  themeTokens?: Record<string, unknown> | null;
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
  /**
   * Primary variation photo resolved server-side by the public-site
   * repository. Null when the product has no active variation or no
   * photos — templates fall back to an imsCode placeholder block.
   */
  photoUrl?: string | null;
  /**
   * Only populated on the product detail endpoint. Empty array = no
   * photos. First entry is the primary photo (same as `photoUrl` on the
   * list endpoint).
   */
  photoUrls?: string[];
}

export interface PublicProductList {
  products: PublicProduct[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicNavPage {
  id: string;
  slug: string;
  title: string;
  navOrder: number;
}

export interface PublicBlogCategory {
  id: string;
  slug: string;
  name: string;
}

export interface PublicBlogCategoryWithCount extends PublicBlogCategory {
  description: string | null;
  postCount: number;
  sortOrder: number;
}

export interface PublicBlogPostListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  heroImageUrl: string | null;
  authorName: string | null;
  publishedAt: string | null;
  tags: string[];
  readingMinutes: number | null;
  category: PublicBlogCategory | null;
}

export interface PublicBlogPost extends PublicBlogPostListItem {
  bodyMarkdown: string;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface PublicBlogPostList {
  posts: PublicBlogPostListItem[];
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

export type ProductSort = "newest" | "price-asc" | "price-desc" | "name-asc";

export function getProducts(
  host: string,
  tenantId: string,
  query: {
    page?: number;
    limit?: number;
    categoryId?: string;
    sort?: ProductSort;
    search?: string;
  } = {},
) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.sort) params.set("sort", query.sort);
  if (query.search) params.set("search", query.search);
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

// ============================================================================
// Tenant custom pages (About, FAQ, ...)
// ============================================================================

// ============================================================================
// Guest orders (E.2 cart → E.1 backend)
//
// Unlike every other call in this file, checkout is a POST. It doesn't
// go through publicFetch() because:
//   - the response is never cached (no next.tags / revalidate)
//   - failures need to bubble up to the form with a real error message
//     instead of the publicFetch "return null, log and move on" posture
// ============================================================================

export type GuestOrderCartItem = {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export interface GuestOrderPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerNote?: string;
  items: GuestOrderCartItem[];
}

export interface GuestOrderResponse {
  message: string;
  orderCode?: string;
}

export async function postGuestOrder(
  _host: string,
  _tenantId: string,
  body: GuestOrderPayload,
): Promise<GuestOrderResponse | null> {
  // IMPORTANT: this runs in the browser from CheckoutForm.tsx (which is
  // "use client"). We MUST NOT read `API_INTERNAL_URL` here — it's a
  // server-only env var that Next.js strips from the client bundle, so
  // the fetch would fall back to localhost:4000 and fail on the
  // customer's device. Post to a same-origin relative path instead; the
  // Next route handler at /app/api/public/orders/route.ts forwards to
  // the backend server-to-server using the internal env var.
  try {
    const res = await fetch("/api/public/orders", {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await res.json().catch(() => null)) as
      | (GuestOrderResponse & { message?: string })
      | null;
    if (!res.ok) {
      return {
        message: payload?.message ?? `Checkout failed (${res.status})`,
      };
    }
    return payload;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[tenant-site] postGuestOrder threw", error);
    return {
      message: "Could not reach the checkout service. Please try again.",
    };
  }
}

export interface CartPingPayload {
  sessionKey: string;
  items: GuestOrderCartItem[];
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

/**
 * Fire-and-forget cart activity ping. Response is 204 on success.
 * Never throws — the caller (CartProvider) treats any failure as a
 * dropped heartbeat and the next mutation tries again.
 *
 * See postGuestOrder for why we go through a same-origin Next route
 * handler instead of hitting the API directly from the browser.
 */
export async function postCartPing(
  _host: string,
  body: CartPingPayload,
): Promise<boolean> {
  try {
    const res = await fetch("/api/public/cart-pings", {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getNavPages(
  host: string,
  tenantId: string,
): Promise<PublicNavPage[]> {
  const resp = await publicFetch<{ pages: PublicNavPage[] }>(
    "/public/pages?nav=1",
    {
      host,
      tenantId,
      // Header nav reads this list; any page mutation invalidates it via
      // the tenant:<id>:pages + tenant:<id>:site tags in pages.revalidate.ts.
      tags: [`tenant:${tenantId}:pages`, `tenant:${tenantId}:site`],
    },
  );
  return resp?.pages ?? [];
}

export interface PublicTenantPage {
  id: string;
  slug: string;
  title: string;
  bodyMarkdown: string;
  layoutVariant: "default" | "full-width" | "narrow" | string;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
}

// ============================================================================
// Site layouts (block-based templating — Phase 1)
// ============================================================================

export type PublicSiteLayoutScope =
  | "header"
  | "footer"
  | "home"
  | "products-index"
  | "product-detail"
  | "blog-index"
  | "blog-post"
  | "page"
  | "404"
  | "landing";

export interface PublicSiteLayout {
  scope: PublicSiteLayoutScope | string;
  pageId: string | null;
  // The server validates the block tree shape; typed loosely here because
  // the renderer (BlockRenderer) does its own per-block lookup and the
  // editor is the writer of record.
  blocks: unknown;
  version: number;
  updatedAt: string;
}

/**
 * Fetch the published block tree for a given scope. Returns null if no
 * layout exists for this tenant/scope — callers then fall back to the
 * legacy `pickTemplate` / markdown rendering path.
 */
export async function getSiteLayout(
  host: string,
  tenantId: string,
  scope: PublicSiteLayoutScope,
  pageId?: string,
): Promise<PublicSiteLayout | null> {
  const suffix = pageId ? `?pageId=${encodeURIComponent(pageId)}` : "";
  const tags = [
    `tenant:${tenantId}:site`,
    `tenant:${tenantId}:layout:${scope}`,
  ];
  const resp = await publicFetch<{ layout: PublicSiteLayout }>(
    `/public/site-layouts/${scope}${suffix}`,
    { host, tenantId, tags },
  );
  return resp?.layout ?? null;
}

// ============================================================================
// Nav menus (Phase 2 — customizable header/footer/drawer)
// ============================================================================

export type PublicNavSlot =
  | "header-primary"
  | "footer-1"
  | "footer-2"
  | "mobile-drawer";

export interface PublicNavMenu {
  slot: PublicNavSlot | string;
  /** Either a full NavConfig (header) or { items } (footer/drawer) — the
   *  renderer decodes based on the slot. */
  items: unknown;
  updatedAt: string;
}

export async function getNavMenu(
  host: string,
  tenantId: string,
  slot: PublicNavSlot,
): Promise<PublicNavMenu | null> {
  const tags = [`tenant:${tenantId}:site`, `tenant:${tenantId}:nav:${slot}`];
  const resp = await publicFetch<{ menu: PublicNavMenu }>(
    `/public/nav-menus/${slot}`,
    { host, tenantId, tags },
  );
  return resp?.menu ?? null;
}

export async function getTenantPageBySlug(
  host: string,
  tenantId: string,
  slug: string,
): Promise<PublicTenantPage | null> {
  const resp = await publicFetch<{ page: PublicTenantPage }>(
    `/public/pages/${encodeURIComponent(slug)}`,
    {
      host,
      tenantId,
      tags: [`tenant:${tenantId}:page:${slug}`, `tenant:${tenantId}:pages`],
    },
  );
  return resp?.page ?? null;
}

// ============================================================================
// Blog
// ============================================================================

export async function getBlogPosts(
  host: string,
  tenantId: string,
  query: {
    page?: number;
    limit?: number;
    categorySlug?: string;
    tag?: string;
  } = {},
): Promise<PublicBlogPostList> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.categorySlug) params.set("categorySlug", query.categorySlug);
  if (query.tag) params.set("tag", query.tag);
  const suffix = params.toString() ? `?${params.toString()}` : "";

  const resp = await publicFetch<PublicBlogPostList>(
    `/public/blog/posts${suffix}`,
    {
      host,
      tenantId,
      tags: [`tenant:${tenantId}:blog`],
    },
  );
  return (
    resp ?? {
      posts: [],
      total: 0,
      page: query.page ?? 1,
      limit: query.limit ?? 12,
    }
  );
}

export async function getBlogPostBySlug(
  host: string,
  tenantId: string,
  slug: string,
): Promise<{ post: PublicBlogPost; related: PublicBlogPostListItem[] } | null> {
  const resp = await publicFetch<{
    post: PublicBlogPost;
    related: PublicBlogPostListItem[];
  }>(`/public/blog/posts/${encodeURIComponent(slug)}`, {
    host,
    tenantId,
    tags: [`tenant:${tenantId}:blog:${slug}`, `tenant:${tenantId}:blog`],
  });
  return resp ?? null;
}

export async function getFeaturedBlogPosts(
  host: string,
  tenantId: string,
  limit = 3,
): Promise<PublicBlogPostListItem[]> {
  const resp = await publicFetch<{ posts: PublicBlogPostListItem[] }>(
    `/public/blog/featured?limit=${limit}`,
    {
      host,
      tenantId,
      // Featured section is part of the homepage — tag both so a blog
      // mutation revalidates the homepage too.
      tags: [`tenant:${tenantId}:blog`, `tenant:${tenantId}:site`],
    },
  );
  return resp?.posts ?? [];
}

export async function getBlogCategories(
  host: string,
  tenantId: string,
): Promise<PublicBlogCategoryWithCount[]> {
  const resp = await publicFetch<{ categories: PublicBlogCategoryWithCount[] }>(
    "/public/blog/categories",
    {
      host,
      tenantId,
      tags: [`tenant:${tenantId}:blog`],
    },
  );
  return resp?.categories ?? [];
}
