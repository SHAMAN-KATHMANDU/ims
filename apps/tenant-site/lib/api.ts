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

/**
 * Analytics tracker IDs stored on the site config.
 * Injected server-side into <head> on published, indexable pages only.
 */
export interface PublicSiteAnalytics {
  ga4MeasurementId?: string;
  gtmContainerId?: string;
  metaPixelId?: string;
  consentMode?: "basic" | "granted";
}

export interface PublicSiteNavItem {
  id: string;
  label: string;
  href: string;
}

export interface PublicSiteNavGroup {
  id: string;
  title: string;
  items: PublicSiteNavItem[];
}

/**
 * Editor-managed navigation propagated from `SiteConfig.navigation`. The
 * NavBarBlock + footer-columns block read this so a tenant editing the
 * Navigation tab updates every header/footer instance at once.
 */
export interface PublicSiteNavigation {
  primary: PublicSiteNavItem[];
  utility?: PublicSiteNavItem[];
  footer?: PublicSiteNavGroup[];
}

export interface PublicSite {
  branding: Record<string, unknown> | null;
  contact: Record<string, unknown> | null;
  features: Record<string, unknown> | null;
  seo: Record<string, unknown> | null;
  /** Structured design tokens (Phase 7+). Preferred over branding when set. */
  themeTokens?: Record<string, unknown> | null;
  /** Analytics tracker IDs — GA4, GTM, Meta Pixel, Consent Mode. */
  analytics?: PublicSiteAnalytics | null;
  /** Editor-managed nav from SiteConfig.navigation; null if never seeded. */
  navigation?: PublicSiteNavigation | null;
  template: PublicTemplate | null;
  /** BCP-47 tag: tenant's default locale (drives Intl formatting). */
  locale?: string | null;
  /** All locales the tenant has configured content for. */
  locales?: string[];
  /** ISO 4217 code (INR, NPR, USD, …) — drives price formatting. */
  currency?: string | null;
  /**
   * Business identity merged in by getSiteWithProfile(). Null for tenants
   * without a TenantBusinessProfile row yet, in which case all components
   * fall back to the legacy branding / contact JSON fields.
   */
  businessProfile?: PublicBusinessProfile | null;
}

/**
 * Public business-profile DTO — mirrors PublicBusinessProfileDto from the API's
 * internal controller (tax/regulatory fields stripped).
 *
 * Populated by getSiteWithProfile() via GET /api/v1/internal/tenants/:slug/business-profile.
 * Null for tenants without a TenantBusinessProfile row; components fall back to
 * site.branding / site.contact in that case.
 */
export interface PublicBusinessProfile {
  id: string;
  tenantId: string;
  legalName: string | null;
  displayName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  websiteUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  mapUrl: string | null;
  defaultCurrency: string;
  timezone: string | null;
  socials: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface PublicProductVariationAttribute {
  typeId: string;
  typeName: string;
  typeCode: string;
  valueId: string;
  value: string;
}

export interface PublicProductSubVariation {
  id: string;
  name: string;
}

export interface PublicProductVariation {
  id: string;
  name: string;
  sku: string | null;
  finalSp: string;
  mrp: string;
  stockQuantity: number;
  attributes: PublicProductVariationAttribute[];
  subVariations: PublicProductSubVariation[];
  photoUrls: string[];
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
  /** Dimensions & weight — populated on the detail endpoint when present. */
  length?: number | null;
  breadth?: number | null;
  height?: number | null;
  weight?: number | null;
  /**
   * Variation summary for cards. Present on list + detail. When > 1 the
   * card can render "From NPR X" via priceFrom/priceTo.
   */
  variationCount?: number;
  priceFrom?: string;
  priceTo?: string;
  /**
   * Full active-variation set — only populated on the detail endpoint.
   * The PDP buybox consumes this to render attribute-grouped chips.
   */
  variations?: PublicProductVariation[];
  /**
   * Aggregate APPROVED review rating (rounded to one decimal) or null
   * when the product has no approved reviews yet.
   */
  avgRating?: number | null;
  ratingCount?: number | null;
}

export interface PublicProductReview {
  id: string;
  rating: number;
  body: string | null;
  authorName: string | null;
  createdAt: string;
}

export interface PublicProductReviewList {
  reviews: PublicProductReview[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicProductFacetValue {
  valueId: string;
  value: string;
  count: number;
}

export interface PublicProductFacetAttribute {
  typeId: string;
  typeName: string;
  typeCode: string;
  values: PublicProductFacetValue[];
}

export interface PublicProductBrandFacet {
  id: string;
  name: string;
  count: number;
}

export interface PublicProductFacets {
  brands: PublicProductBrandFacet[];
  priceMin: string | null;
  priceMax: string | null;
  attributes: PublicProductFacetAttribute[];
}

export interface PublicProductList {
  products: PublicProduct[];
  total: number;
  page: number;
  limit: number;
  facets?: PublicProductFacets;
}

// Bundles -------------------------------------------------------------------

export type BundlePricingStrategy = "SUM" | "DISCOUNT_PCT" | "FIXED";

export interface PublicBundleSummary {
  id: string;
  name: string;
  slug: string;
  productIds: string[];
  pricingStrategy: BundlePricingStrategy;
  discountPct: number | null;
  fixedPrice: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicBundleDetail extends PublicBundleSummary {
  description: string | null;
}

export interface PublicBundleProduct {
  id: string;
  name: string;
  /** Decimal string — the product's current effective price. */
  finalSp: string;
}

export interface PublicBundleList {
  items: PublicBundleSummary[];
  total: number;
  page: number;
  limit: number;
}

// Gift cards ----------------------------------------------------------------

export interface GiftCardRedeemResponse {
  message: string;
  /** Full card payload present on 200 success, omitted on failure. */
  giftCard?: {
    id: string;
    code: string;
    amount: number;
    balance: number;
    status: "ACTIVE" | "REDEEMED" | "EXPIRED" | "VOIDED";
    expiresAt: string | null;
  };
}

export interface PublicCollection {
  slug: string;
  title: string;
  subtitle: string | null;
  products: PublicProduct[];
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
  /** Phase 8: Notion-style full-bleed cover above the title. */
  coverImageUrl?: string | null;
  /** Phase 8: emoji or short string rendered before the heading. */
  icon?: string | null;
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
    minPrice?: number;
    maxPrice?: number;
    vendorId?: string;
    /**
     * EAV attribute filter. Keys are attribute-type IDs, values are
     * selected attribute-value IDs. Sent to the API as
     * `attr[<typeId>]=<valueId>` per Express's qs-nested parsing.
     */
    attr?: Record<string, string>;
  } = {},
) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.sort) params.set("sort", query.sort);
  if (query.search) params.set("search", query.search);
  if (query.minPrice != null) params.set("minPrice", String(query.minPrice));
  if (query.maxPrice != null) params.set("maxPrice", String(query.maxPrice));
  if (query.vendorId) params.set("vendorId", query.vendorId);
  if (query.attr) {
    for (const [typeId, valueId] of Object.entries(query.attr)) {
      if (valueId) params.append(`attr[${typeId}]`, valueId);
    }
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";

  return publicFetch<PublicProductList>(`/public/products${suffix}`, {
    host,
    tenantId,
    tags: [`tenant:${tenantId}:products`],
  });
}

/**
 * Active-discount product list for the /offers route and product-grid
 * blocks with `source="offers"`. Shape matches the main product list
 * so cards render identically.
 */
export function getOffers(
  host: string,
  tenantId: string,
  query: { page?: number; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return publicFetch<PublicProductList>(`/public/offers${suffix}`, {
    host,
    tenantId,
    tags: [`tenant:${tenantId}:offers`],
  });
}

export interface PublicPromo {
  id: string;
  code: string;
  description: string | null;
  valueType: string;
  value: string;
  validFrom: string | null;
  validTo: string | null;
}

/**
 * Currently-active promo codes for the tenant — read by the
 * PromoCardsBlock on /offers and surfaced via BlockDataContext.promos.
 */
export async function getActivePromos(
  host: string,
  tenantId: string,
): Promise<PublicPromo[]> {
  try {
    const result = await publicFetch<{ promos: PublicPromo[] }>(
      `/public/promos/active`,
      {
        host,
        tenantId,
        tags: [`tenant:${tenantId}:promos`],
      },
    );
    return result?.promos ?? [];
  } catch {
    // Promos are nice-to-have on the storefront — never break the page
    // render when the public endpoint is unavailable.
    return [];
  }
}

/**
 * Curated collection lookup. Returns null when the slug doesn't exist
 * (or is inactive) so the block falls back to an empty render.
 */
export function getCollection(
  host: string,
  tenantId: string,
  slug: string,
  limit = 24,
) {
  const suffix = `?limit=${limit}`;
  return publicFetch<{ collection: PublicCollection } | PublicCollection>(
    `/public/collections/${encodeURIComponent(slug)}${suffix}`,
    {
      host,
      tenantId,
      tags: [`tenant:${tenantId}:collection:${slug}`],
    },
  );
}

/**
 * Resolved MediaAsset summary — what the storefront needs to render an
 * `<img src>` for an `{ assetId }` block ref. Returned in batches by
 * `getPublicAssets()` and threaded into BlockDataContext.assets.
 */
export interface PublicAssetSummary {
  id: string;
  publicUrl: string;
  altText: string | null;
  mimeType: string;
}

/**
 * Batch-resolve MediaAsset rows by id. Used by page routes to hydrate
 * every `{ assetId }` ref in the block tree in a single round trip;
 * blocks then look up their refs synchronously via dataContext.assets.
 */
export async function getPublicAssets(
  host: string,
  tenantId: string,
  ids: string[],
): Promise<PublicAssetSummary[]> {
  const filtered = Array.from(new Set(ids.filter(Boolean))).slice(0, 50);
  if (filtered.length === 0) return [];
  try {
    const result = await publicFetch<{ assets: PublicAssetSummary[] }>(
      `/public/assets?ids=${encodeURIComponent(filtered.join(","))}`,
      {
        host,
        tenantId,
        // Asset URLs are stable per id; cache hard with the asset list tag
        // so an admin rename / replace busts the storefront in one shot.
        tags: [`tenant:${tenantId}:assets`],
      },
    );
    return result?.assets ?? [];
  } catch {
    return [];
  }
}

/**
 * Lightweight Collection summary for the CollectionCardsBlock auto-mode
 * resolver — id/slug/title/subtitle, no products. Avoids dragging the
 * full PublicCollection in when only the cover labels are needed.
 */
export interface PublicCollectionSummary {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
}

/**
 * List the tenant's active collections — drives CollectionCardsBlock
 * `source="auto"`. Returns [] on any error so the block renders a graceful
 * empty state instead of breaking the page.
 */
export async function getCollections(
  host: string,
  tenantId: string,
  query: { limit?: number } = {},
): Promise<PublicCollectionSummary[]> {
  const params = new URLSearchParams();
  if (query.limit) params.set("limit", String(query.limit));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  try {
    const result = await publicFetch<{
      collections: PublicCollectionSummary[];
    }>(`/public/collections${suffix}`, {
      host,
      tenantId,
      tags: [`tenant:${tenantId}:collections`],
    });
    return result?.collections ?? [];
  } catch {
    return [];
  }
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

export function getProductReviews(
  host: string,
  tenantId: string,
  productId: string,
  page = 1,
  limit = 10,
): Promise<PublicProductReviewList | null> {
  const qs = `?page=${page}&limit=${limit}`;
  return publicFetch<PublicProductReviewList>(
    `/public/products/${encodeURIComponent(productId)}/reviews${qs}`,
    {
      host,
      tenantId,
      tags: [
        `tenant:${tenantId}:product:${productId}:reviews`,
        `tenant:${tenantId}:reviews`,
      ],
    },
  );
}

export function getFrequentlyBoughtWith(
  host: string,
  tenantId: string,
  productId: string,
): Promise<PublicProduct[]> {
  return publicFetch<{ products: PublicProduct[] } | PublicProduct[]>(
    `/public/products/${encodeURIComponent(productId)}/frequently-bought-with`,
    {
      host,
      tenantId,
      tags: [
        `tenant:${tenantId}:product:${productId}:fbt`,
        `tenant:${tenantId}:products`,
      ],
    },
  ).then((resp) => {
    if (!resp) return [];
    return Array.isArray(resp)
      ? resp
      : ((resp as { products: PublicProduct[] }).products ?? []);
  });
}

// ============================================================================
// Bundles
// ============================================================================

/** List published (active) bundles for this tenant. Returns null on failure. */
export async function getPublicBundles(
  host: string,
  tenantId: string,
  query: { page?: number; limit?: number } = {},
): Promise<PublicBundleList | null> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return publicFetch<PublicBundleList>(`/public/bundles${suffix}`, {
    host,
    tenantId,
    tags: [`tenant:${tenantId}:bundles`],
  });
}

/**
 * Fetch a single published bundle by slug, including the dereferenced
 * product summaries (id, name, finalSp). Returns null when the slug
 * doesn't resolve to an active bundle.
 */
export async function getPublicBundleBySlug(
  host: string,
  tenantId: string,
  slug: string,
): Promise<{
  bundle: PublicBundleDetail;
  products: PublicBundleProduct[];
} | null> {
  const resp = await publicFetch<{
    bundle: PublicBundleDetail;
    products: PublicBundleProduct[];
  }>(`/public/bundles/${encodeURIComponent(slug)}`, {
    host,
    tenantId,
    tags: [`tenant:${tenantId}:bundle:${slug}`, `tenant:${tenantId}:bundles`],
  });
  return resp ? { bundle: resp.bundle, products: resp.products ?? [] } : null;
}

// ============================================================================
// Gift card redeem (client-side POST via same-origin forwarder)
// ============================================================================

/**
 * Redeem a gift card balance. Runs in the browser from the redeem block,
 * so it goes through the same-origin Next route handler (like the guest
 * order path) to keep API_INTERNAL_URL off the client bundle.
 */
export async function postGiftCardRedeem(body: {
  code: string;
  amount: number;
}): Promise<GiftCardRedeemResponse> {
  try {
    const res = await fetch("/api/public/gift-cards/redeem", {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await res
      .json()
      .catch(() => null)) as GiftCardRedeemResponse | null;
    if (!res.ok) {
      return {
        message: payload?.message ?? `Redeem failed (${res.status})`,
      };
    }
    return payload ?? { message: "Gift card redeemed" };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[tenant-site] postGiftCardRedeem threw", error);
    return { message: "Could not reach the redeem service. Please try again." };
  }
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
  /** Customer-selected variation — null for legacy carts. */
  variationId?: string | null;
  subVariationId?: string | null;
  variationLabel?: string | null;
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
  /** Phase 8: Notion-style full-bleed cover above the title. */
  coverImageUrl?: string | null;
  /** Phase 8: emoji or short string rendered before the heading. */
  icon?: string | null;
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
  | "offers"
  | "cart"
  | "blog-index"
  | "blog-post"
  | "page"
  | "contact"
  | "404"
  | "not-found"
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
// Nav menus (DEPRECATED: Phase 9 — dropped in favor of block-based layouts)
// ============================================================================
// The /public/nav-menus/* endpoints no longer exist. Layouts are now
// purely block-based from SiteLayout rows. These types/functions are
// retained for reference but are no longer functional.

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
// Snippets (Phase 5 — reusable BlockNode[] sub-trees)
// ============================================================================

/**
 * One snippet body for the snippet-ref renderer. The body is loosely
 * typed as `unknown` here because the renderer hands it directly back to
 * BlockRenderer which already does the per-kind validation.
 */
export interface PublicSnippet {
  id: string;
  slug: string;
  title: string;
  body: unknown;
}

export async function getSnippetById(
  host: string,
  tenantId: string,
  id: string,
): Promise<PublicSnippet | null> {
  const resp = await publicFetch<{ snippet: PublicSnippet }>(
    `/public/snippets/${encodeURIComponent(id)}`,
    {
      host,
      tenantId,
      tags: [`tenant:${tenantId}:snippet:${id}`, `tenant:${tenantId}:snippets`],
    },
  );
  return resp?.snippet ?? null;
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

// ============================================================================
// Business Profile (identity layer — Phase B)
// ============================================================================

/**
 * Fetch the tenant's business profile (displayName, logo, contact, address).
 *
 * GET /api/v1/internal/tenants/:slug/business-profile
 * Returns null for tenants without a TenantBusinessProfile row yet.
 */
export async function getBusinessProfile(
  host: string,
  tenantId: string,
  slug: string,
): Promise<PublicBusinessProfile | null> {
  const resp = await publicFetch<{ profile: PublicBusinessProfile | null }>(
    `/internal/tenants/${encodeURIComponent(slug)}/business-profile`,
    {
      host,
      tenantId,
      tags: [`tenant:${tenantId}:business-profile`],
      revalidate: 300,
    },
  );
  return resp?.profile ?? null;
}

/**
 * Fetch site config and business profile in parallel, returning a merged
 * PublicSite with `businessProfile` populated.
 *
 * Every template component reads identity via `site.businessProfile` first and
 * falls back to the legacy `site.branding` / `site.contact` JSON fields, so
 * older tenants without a TenantBusinessProfile row keep working unchanged.
 *
 * Usage: replace `getSite(host, tenantId)` with
 *   `getSiteWithProfile(host, tenantId, ctx.tenantSlug)` in page handlers.
 */
export async function getSiteWithProfile(
  host: string,
  tenantId: string,
  slug: string,
): Promise<PublicSite | null> {
  const [site, businessProfile] = await Promise.all([
    getSite(host, tenantId),
    getBusinessProfile(host, tenantId, slug),
  ]);
  if (!site) return null;
  return { ...site, businessProfile };
}
