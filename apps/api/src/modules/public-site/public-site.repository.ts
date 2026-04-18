/**
 * Public site repository — read-only queries for content served to unauth'd
 * website visitors. Uses tenant-scoped `prisma`; the resolveTenantFromHostname
 * middleware sets up the AsyncLocalStorage tenant context before handlers run,
 * so queries are auto-scoped. An explicit `tenantId` is also passed as a
 * belt-and-suspenders filter.
 *
 * Phase F.1: product reads now include a flat `photoUrl` field resolved from
 * the first active variation's primary photo (or oldest photo if none are
 * marked primary). The tenant-site renderer consumes this to replace the
 * imsCode placeholder with a real image. Photo lookup is a sub-query, not a
 * join, so the shape stays flat — templates don't have to drill into
 * `variations[0].photos[0].photoUrl`.
 */

import prisma from "@/config/prisma";
import type { Prisma, SiteConfig, SiteTemplate } from "@prisma/client";
import sitesRepo from "@/modules/sites/sites.repository";

export type PublicSiteConfig = SiteConfig & { template: SiteTemplate | null };

/**
 * Per-variation photo cap on the PDP payload. Matches the gallery UX
 * (lightbox + strip max out well below this) and protects the wire from
 * catalog uploads that dump 30+ lifestyle shots onto a single variation.
 * Photos are already ordered so the primary + early uploads win; the tail
 * gets trimmed here, not in the client.
 */
export const PDP_PHOTO_CAP = 12;

/**
 * Trailing window used to rank best-sellers. 90 days is wide enough that
 * seasonal catalogues still have signal but narrow enough that a product
 * that stopped selling six months ago doesn't stay "bestseller" forever.
 */
export const BEST_SELLER_WINDOW_DAYS = 90;

/**
 * Max number of bestseller productIds the repository will carry forward
 * from the SaleItem aggregate. The bestseller path fetches this many rows
 * in one shot and paginates in JS — keeping the cap at 500 means even a
 * limit=100 page 5 fits, and protects us from fetching the entire catalog
 * when a tenant has tens of thousands of selling SKUs.
 */
export const BEST_SELLER_CAP = 500;

/**
 * Shape of a product in a list response — flat, renderer-friendly.
 *
 * Intentionally omits `description` and `subCategory`: neither is rendered
 * on any card/grid surface (PDP-only fields) and both were inflating list
 * payloads by ~KB-per-row at scale. Consumers that need them fetch the
 * `PublicSiteProductDetail` from `GET /public/products/:id`.
 */
export interface PublicSiteProduct {
  id: string;
  name: string;
  imsCode: string;
  mrp: string;
  finalSp: string;
  categoryId: string;
  dateCreated: Date;
  category: { id: string; name: string } | null;
  /** Primary variation photo resolved server-side, or null if none. */
  photoUrl: string | null;
  /**
   * Count of active variations. When > 1 the product card may render a
   * price range via `priceFrom`/`priceTo`.
   */
  variationCount: number;
  /** Cheapest active variation price (finalSpOverride ?? product.finalSp). */
  priceFrom: string;
  /** Priciest active variation price. */
  priceTo: string;
  /**
   * True when the product has at least one active ProductDiscount row
   * whose optional start/end window covers "now". Matches the semantic
   * of the `/public/offers` endpoint so badges stay consistent across
   * surfaces.
   */
  onOffer: boolean;
  /**
   * Integer percent saved when finalSp < mrp, else null. Derived purely
   * from the price fields — does NOT look at ProductDiscount. This is
   * the number the "strikethrough + X% OFF" badge reads.
   */
  discountPct: number | null;
  /**
   * Human-readable version of discountPct, e.g. "25% OFF". null when
   * there is no discount. Centralized here so all storefront surfaces
   * format the label identically.
   */
  discountLabel: string | null;
  /**
   * Average customer rating (1–5, fractional allowed). Always `null`
   * today: there is no ProductReview table yet. The field is on the
   * wire contract so the tenant-site star-rating UI can bind to the
   * final shape now and flip to a real aggregate the moment the
   * reviews feature lands — no client redeploy required.
   */
  avgRating: number | null;
  /**
   * Number of customer ratings contributing to `avgRating`. Always
   * `null` until a reviews table exists (see `avgRating` above).
   */
  ratingCount: number | null;
}

/** Structured attribute payload used by the PDP buybox chip selector. */
export interface PublicSiteVariationAttribute {
  typeId: string;
  typeName: string;
  typeCode: string;
  valueId: string;
  value: string;
}

export interface PublicSiteSubVariation {
  id: string;
  name: string;
}

export interface PublicSiteVariation {
  id: string;
  /**
   * Legacy name field — kept for renderers that expect one. The PDP
   * buybox uses `attributes` to render grouped chips instead.
   */
  name: string;
  /** Variation-level SKU; falls back to product.imsCode if null. */
  sku: string | null;
  /** Final selling price — override if set, else product.finalSp. */
  finalSp: string;
  mrp: string;
  stockQuantity: number;
  attributes: PublicSiteVariationAttribute[];
  subVariations: PublicSiteSubVariation[];
  photoUrls: string[];
}

export interface PublicSiteFacets {
  /**
   * Brand / vendor facet. `count` reflects how many products in the
   * currently filtered scope belong to each brand — stacks as filters
   * are added so the UI shows live counts.
   */
  brands: { id: string; name: string; count: number }[];
  /** Price range across the filtered scope (null when nothing matches). */
  priceMin: string | null;
  priceMax: string | null;
  /** EAV attribute facet grouped by type with per-value counts. */
  attributes: {
    typeId: string;
    typeName: string;
    typeCode: string;
    values: { valueId: string; value: string; count: number }[];
  }[];
}

export interface PublicSiteProductDetail extends PublicSiteProduct {
  /** PDP-only; intentionally not on the list row. */
  description: string | null;
  /** PDP-only; intentionally not on the list row. */
  subCategory: string | null;
  length: Prisma.Decimal | null;
  breadth: Prisma.Decimal | null;
  height: Prisma.Decimal | null;
  weight: Prisma.Decimal | null;
  /** All available photos for gallery rendering (first = primary). */
  photoUrls: string[];
  /** All active variations, ordered by attribute display order. */
  variations: PublicSiteVariation[];
}

/**
 * Select clause for fetching every active variation's photo + price
 * override. The listing endpoint uses this to (a) pick a primary photo
 * for the card and (b) compute the price range when the product has
 * multiple variations. One select on the client is more predictable
 * than separate aggregate + photo queries and keeps row counts low
 * (most products have 1–3 variations).
 *
 * Ordered by createdAt ASC so the first active variation is stable;
 * photos ordered by isPrimary DESC then upload date ASC so the flagged
 * primary wins and ties break by oldest.
 */
const LIST_VARIATION_SELECT = {
  variations: {
    where: { isActive: true },
    orderBy: { createdAt: "asc" as const },
    select: {
      finalSpOverride: true,
      mrpOverride: true,
      photos: {
        orderBy: [
          { isPrimary: "desc" as const },
          { uploadDate: "asc" as const },
        ],
        take: 1,
        select: { photoUrl: true },
      },
    },
  },
} satisfies Prisma.ProductSelect;

type ListVariationRow = {
  finalSpOverride: Prisma.Decimal | null;
  mrpOverride: Prisma.Decimal | null;
  photos: { photoUrl: string }[];
};

/**
 * Compute price-range stats from a product's list-select variations plus
 * its base finalSp/mrp. Falls back to the base price when a variation
 * doesn't override; when there are zero active variations we report
 * variationCount=0 and priceFrom=priceTo=finalSp so cards still render.
 */
function priceStats(
  variations: ListVariationRow[],
  baseFinalSp: Prisma.Decimal,
): { variationCount: number; priceFrom: string; priceTo: string } {
  if (variations.length === 0) {
    return {
      variationCount: 0,
      priceFrom: baseFinalSp.toString(),
      priceTo: baseFinalSp.toString(),
    };
  }
  const prices = variations.map((v) =>
    (v.finalSpOverride ?? baseFinalSp).toString(),
  );
  const numeric = prices.map(Number);
  const minIdx = numeric.indexOf(Math.min(...numeric));
  const maxIdx = numeric.indexOf(Math.max(...numeric));
  return {
    variationCount: variations.length,
    priceFrom: prices[minIdx]!,
    priceTo: prices[maxIdx]!,
  };
}

/**
 * Default rating payload used when a product has zero APPROVED reviews.
 * The type is `number | null` so the wire shape stays stable; when no
 * reviews exist yet, both fields are null rather than { null, 0 } so
 * tenant-sites pre-review can't distinguish "feature just shipped" from
 * "this specific product has no reviews yet" — either way they hide the
 * rating block. The helper below overlays real values on top.
 */
const NULL_RATINGS = {
  avgRating: null as number | null,
  ratingCount: null as number | null,
};

function primaryPhotoFromList(variations: ListVariationRow[]): string | null {
  const variation = variations[0];
  if (!variation) return null;
  return variation.photos[0]?.photoUrl ?? null;
}

/**
 * Derive the three discount fields on a product card from its prices
 * plus whether an active ProductDiscount row exists for it right now.
 *
 * discountPct is computed from (mrp, finalSp) rather than from the
 * ProductDiscount row because the product-card contract is "show what
 * the customer actually saves at the current list/sell prices". Stores
 * sometimes set finalSp = mrp and rely on ProductDiscount for the
 * actual reduction; in that case discountPct is null but `onOffer`
 * is still true, so the UI can show an "On Offer" badge without a
 * bogus strikethrough.
 */
export function deriveDiscount(
  mrp: Prisma.Decimal | number | string,
  finalSp: Prisma.Decimal | number | string,
  hasActiveDiscount: boolean,
): {
  onOffer: boolean;
  discountPct: number | null;
  discountLabel: string | null;
} {
  const mrpNum = Number(mrp);
  const finalSpNum = Number(finalSp);
  let discountPct: number | null = null;
  if (mrpNum > 0 && finalSpNum >= 0 && finalSpNum < mrpNum) {
    discountPct = Math.round(((mrpNum - finalSpNum) / mrpNum) * 100);
    if (discountPct <= 0) discountPct = null;
  }
  return {
    onOffer: hasActiveDiscount,
    discountPct,
    discountLabel: discountPct != null ? `${discountPct}% OFF` : null,
  };
}

/**
 * Prisma where clause for "an active discount row whose optional
 * start/end window covers `now`". Extracted so list / detail / collection
 * selects all agree on the same semantic.
 */
function activeDiscountWhere(now: Date): Prisma.ProductDiscountWhereInput {
  return {
    isActive: true,
    AND: [
      { OR: [{ startDate: null }, { startDate: { lte: now } }] },
      { OR: [{ endDate: null }, { endDate: { gte: now } }] },
    ],
  };
}

export class PublicSiteRepository {
  /**
   * Delegates to sitesRepo.findConfig so the per-request memoization
   * there (see SitesRepository.findConfig) also applies to callers
   * going through the public-site service. Keeps both repos returning
   * the same SiteConfig promise within a request.
   */
  findSiteConfig(tenantId: string): Promise<PublicSiteConfig | null> {
    return sitesRepo.findConfig(tenantId);
  }

  async listProducts(
    tenantId: string,
    opts: {
      page: number;
      limit: number;
      categoryId?: string;
      search?: string;
      sort?:
        | "newest"
        | "price-asc"
        | "price-desc"
        | "name-asc"
        | "best-selling";
      minPrice?: number;
      maxPrice?: number;
      vendorId?: string;
      attr?: Record<string, string>;
      /**
       * When true, only products with an active ProductDiscount row
       * are returned. Drives the /offers page + the product-grid
       * block's `source="offers"` variant.
       */
      onOfferOnly?: boolean;
      /** Restrict the result to products in this collection (ordered). */
      collectionId?: string;
      /**
       * Compute + return facets (brands, price range, attribute values
       * with counts). Disabled by default because facets cost three
       * extra queries per list — only the products-index route + the
       * sidebar filter block actually consume them.
       */
      includeFacets?: boolean;
    },
  ): Promise<[PublicSiteProduct[], number, PublicSiteFacets | null]> {
    const finalSpFilter: Record<string, number> = {};
    if (opts.minPrice != null) finalSpFilter.gte = opts.minPrice;
    if (opts.maxPrice != null) finalSpFilter.lte = opts.maxPrice;

    // Attribute filter: a product matches when, for every (typeId,
    // valueId) pair, at least one of its active variations carries
    // that attribute. Prisma's `AND` of `some` clauses gives us the
    // conjunction — different typeIds can be satisfied by different
    // variations on the same product, which matches how customers
    // think about a "Red AND Small" filter (any red, any small).
    const attrEntries = Object.entries(opts.attr ?? {});
    const attrAnd: Prisma.ProductWhereInput[] = attrEntries.map(
      ([attributeTypeId, attributeValueId]) => ({
        variations: {
          some: {
            isActive: true,
            attributes: { some: { attributeTypeId, attributeValueId } },
          },
        },
      }),
    );

    const now = new Date();
    const where: Prisma.ProductWhereInput = {
      tenantId,
      deletedAt: null,
      ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
      ...(opts.vendorId ? { vendorId: opts.vendorId } : {}),
      ...(opts.search
        ? { name: { contains: opts.search, mode: "insensitive" } }
        : {}),
      ...(Object.keys(finalSpFilter).length > 0
        ? { finalSp: finalSpFilter }
        : {}),
      ...(attrAnd.length > 0 ? { AND: attrAnd } : {}),
      // On-offer: at least one ProductDiscount row currently active
      // within its optional window. Nulls on startDate/endDate mean
      // "always" so the or-clauses below cover all four combinations.
      ...(opts.onOfferOnly
        ? {
            discounts: {
              some: {
                isActive: true,
                AND: [
                  {
                    OR: [{ startDate: null }, { startDate: { lte: now } }],
                  },
                  {
                    OR: [{ endDate: null }, { endDate: { gte: now } }],
                  },
                ],
              },
            },
          }
        : {}),
      ...(opts.collectionId
        ? { collections: { some: { collectionId: opts.collectionId } } }
        : {}),
    };

    if (opts.sort === "best-selling") {
      return this.listBestSellingProducts(tenantId, where, opts, now);
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput[] =
      opts.sort === "price-asc"
        ? [{ finalSp: "asc" }]
        : opts.sort === "price-desc"
          ? [{ finalSp: "desc" }]
          : opts.sort === "name-asc"
            ? [{ name: "asc" }]
            : [{ dateCreated: "desc" }];

    const [rows, total, facets] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        select: {
          id: true,
          name: true,
          imsCode: true,
          mrp: true,
          finalSp: true,
          categoryId: true,
          dateCreated: true,
          category: { select: { id: true, name: true } },
          ...LIST_VARIATION_SELECT,
          discounts: {
            where: activeDiscountWhere(now),
            select: { id: true },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
      opts.includeFacets
        ? this.computeFacets(tenantId, where)
        : Promise.resolve(null),
    ]);

    const ratings = await this.loadRatingsByProduct(
      tenantId,
      rows.map((r) => r.id),
    );
    const products: PublicSiteProduct[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      imsCode: r.imsCode,
      mrp: r.mrp.toString(),
      finalSp: r.finalSp.toString(),
      categoryId: r.categoryId,
      dateCreated: r.dateCreated,
      category: r.category,
      photoUrl: primaryPhotoFromList(r.variations),
      ...priceStats(r.variations, r.finalSp),
      ...deriveDiscount(r.mrp, r.finalSp, r.discounts.length > 0),
      ...(ratings.get(r.id) ?? NULL_RATINGS),
    }));
    return [products, total, facets];
  }

  /**
   * Compute brand, price-range, and attribute facets over a given
   * product filter. Counts are scoped to the same filter set — so as
   * the visitor adds filters the sidebar counts drop, which is the
   * standard "live facet" behavior. Attribute counts use `productId`
   * distinct so a product with three red variations still counts as one
   * red match.
   *
   * Query shape: the per-row attribute fetch selects only the foreign
   * keys (typeId, valueId) + the variation's productId. Type/value
   * metadata (name, code, displayOrder) is resolved in two bulk lookups
   * *after* dedupe, so the large join-scoped query doesn't ship
   * thousands of redundant copies of the same AttributeType/Value
   * strings — one copy per distinct id is enough.
   */
  private async computeFacets(
    tenantId: string,
    where: Prisma.ProductWhereInput,
  ): Promise<PublicSiteFacets> {
    const [brandGroups, priceAgg, attrRows] = await Promise.all([
      prisma.product.groupBy({
        by: ["vendorId"],
        where: { ...where, NOT: [{ vendorId: null }] },
        _count: { _all: true },
      }),
      prisma.product.aggregate({
        where,
        _min: { finalSp: true },
        _max: { finalSp: true },
      }),
      // All (typeId, valueId) tuples that appear on any active
      // variation of any product in the current filter scope. We only
      // select the foreign keys + productId here; metadata is resolved
      // below in bulk so the payload of this (potentially large) query
      // stays tight.
      prisma.productVariationAttribute.findMany({
        where: {
          variation: {
            isActive: true,
            product: where,
          },
        },
        select: {
          attributeTypeId: true,
          attributeValueId: true,
          variation: { select: { productId: true } },
        },
      }),
    ]);

    // Resolve vendor names in one query for the brand facet.
    const vendorIds = brandGroups
      .map((g) => g.vendorId)
      .filter((id): id is string => !!id);

    // Collect distinct type/value ids so we can resolve metadata in two
    // small bulk queries regardless of how wide the per-row fan-out was.
    const distinctTypeIds = new Set<string>();
    const distinctValueIds = new Set<string>();
    for (const row of attrRows) {
      distinctTypeIds.add(row.attributeTypeId);
      distinctValueIds.add(row.attributeValueId);
    }

    const [vendorRows, typeRows, valueRows] = await Promise.all([
      vendorIds.length > 0
        ? prisma.vendor.findMany({
            where: { id: { in: vendorIds }, tenantId },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      distinctTypeIds.size > 0
        ? prisma.attributeType.findMany({
            where: { id: { in: Array.from(distinctTypeIds) } },
            select: { id: true, name: true, code: true, displayOrder: true },
          })
        : Promise.resolve([]),
      distinctValueIds.size > 0
        ? prisma.attributeValue.findMany({
            where: { id: { in: Array.from(distinctValueIds) } },
            select: { id: true, value: true, displayOrder: true },
          })
        : Promise.resolve([]),
    ]);

    const vendorById = new Map(vendorRows.map((v) => [v.id, v.name]));
    const brands = brandGroups
      .map((g) => ({
        id: g.vendorId!,
        name: vendorById.get(g.vendorId!) ?? "Unknown",
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    const typeById = new Map(typeRows.map((t) => [t.id, t]));
    const valueById = new Map(valueRows.map((v) => [v.id, v]));

    // Dedupe attr rows to (typeId, valueId, productId) so the count is
    // "products with this value", not "variation attribute rows".
    type Bucket = {
      typeId: string;
      typeName: string;
      typeCode: string;
      typeOrder: number;
      values: Map<
        string,
        {
          valueId: string;
          value: string;
          valueOrder: number;
          products: Set<string>;
        }
      >;
    };
    const byType = new Map<string, Bucket>();
    for (const row of attrRows) {
      const typeMeta = typeById.get(row.attributeTypeId);
      const valueMeta = valueById.get(row.attributeValueId);
      // Skip rows whose type/value was deleted between the two queries;
      // the facet omits them rather than surfacing "Unknown" placeholders.
      if (!typeMeta || !valueMeta) continue;
      const productId = row.variation.productId;
      let bucket = byType.get(typeMeta.id);
      if (!bucket) {
        bucket = {
          typeId: typeMeta.id,
          typeName: typeMeta.name,
          typeCode: typeMeta.code,
          typeOrder: typeMeta.displayOrder,
          values: new Map(),
        };
        byType.set(typeMeta.id, bucket);
      }
      let value = bucket.values.get(valueMeta.id);
      if (!value) {
        value = {
          valueId: valueMeta.id,
          value: valueMeta.value,
          valueOrder: valueMeta.displayOrder,
          products: new Set(),
        };
        bucket.values.set(valueMeta.id, value);
      }
      value.products.add(productId);
    }
    const attributes = Array.from(byType.values())
      .sort((a, b) => a.typeOrder - b.typeOrder)
      .map((bucket) => ({
        typeId: bucket.typeId,
        typeName: bucket.typeName,
        typeCode: bucket.typeCode,
        values: Array.from(bucket.values.values())
          .sort((a, b) => a.valueOrder - b.valueOrder)
          .map((v) => ({
            valueId: v.valueId,
            value: v.value,
            count: v.products.size,
          })),
      }));

    return {
      brands,
      priceMin: priceAgg._min.finalSp?.toString() ?? null,
      priceMax: priceAgg._max.finalSp?.toString() ?? null,
      attributes,
    };
  }

  /**
   * Best-sellers path for listProducts. Ranks by SaleItem row count per
   * product over a trailing window, intersects with the caller's filter,
   * and paginates in memory so pages preserve rank order.
   *
   * Why not ORDER BY inside Prisma: product.findMany can't directly
   * ORDER BY a sale-item aggregate. We could drop to raw SQL, but the
   * bounded `BEST_SELLER_CAP` (500) keeps the in-memory sort + paginate
   * cheap and keeps the rest of the select pipeline (variation photos,
   * discounts, price stats) working the same as every other sort.
   */
  private async listBestSellingProducts(
    tenantId: string,
    where: Prisma.ProductWhereInput,
    opts: { page: number; limit: number; includeFacets?: boolean },
    now: Date,
  ): Promise<[PublicSiteProduct[], number, PublicSiteFacets | null]> {
    const trailingStart = new Date(
      now.getTime() - BEST_SELLER_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const grouped = await prisma.saleItem.groupBy({
      by: ["variationId"],
      where: {
        sale: {
          tenantId,
          deletedAt: null,
          createdAt: { gte: trailingStart },
        },
      },
      _count: { _all: true },
    });

    if (grouped.length === 0) {
      // No sales in the window — "best sellers" has no signal; return
      // an empty page rather than silently falling back to newest, so
      // the UI label stays honest.
      const facets = opts.includeFacets
        ? await this.computeFacets(tenantId, where)
        : null;
      return [[], 0, facets];
    }

    const variationRows = await prisma.productVariation.findMany({
      where: { id: { in: grouped.map((r) => r.variationId) } },
      select: { id: true, productId: true },
    });
    const variationToProduct = new Map(
      variationRows.map((v) => [v.id, v.productId]),
    );
    const countByProduct = new Map<string, number>();
    for (const row of grouped) {
      const productId = variationToProduct.get(row.variationId);
      if (!productId) continue;
      countByProduct.set(
        productId,
        (countByProduct.get(productId) ?? 0) + row._count._all,
      );
    }

    // Tie-break by productId so the order is stable run-to-run — two
    // products with the same sale count must appear in the same slot
    // across paginated requests.
    const rankedProductIds = Array.from(countByProduct.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, BEST_SELLER_CAP)
      .map(([id]) => id);

    const restrictedWhere: Prisma.ProductWhereInput = {
      ...where,
      id: { in: rankedProductIds },
    };

    const [rows, facets] = await Promise.all([
      prisma.product.findMany({
        where: restrictedWhere,
        select: {
          id: true,
          name: true,
          imsCode: true,
          mrp: true,
          finalSp: true,
          categoryId: true,
          dateCreated: true,
          category: { select: { id: true, name: true } },
          ...LIST_VARIATION_SELECT,
          discounts: {
            where: activeDiscountWhere(now),
            select: { id: true },
            take: 1,
          },
        },
      }),
      opts.includeFacets
        ? this.computeFacets(tenantId, where)
        : Promise.resolve(null),
    ]);

    const ratings = await this.loadRatingsByProduct(
      tenantId,
      rows.map((r) => r.id),
    );
    const rowById = new Map(rows.map((r) => [r.id, r]));
    const orderedFull: PublicSiteProduct[] = [];
    for (const pid of rankedProductIds) {
      const r = rowById.get(pid);
      if (!r) continue;
      orderedFull.push({
        id: r.id,
        name: r.name,
        imsCode: r.imsCode,
        mrp: r.mrp.toString(),
        finalSp: r.finalSp.toString(),
        categoryId: r.categoryId,
        dateCreated: r.dateCreated,
        category: r.category,
        photoUrl: primaryPhotoFromList(r.variations),
        ...priceStats(r.variations, r.finalSp),
        ...deriveDiscount(r.mrp, r.finalSp, r.discounts.length > 0),
        ...(ratings.get(r.id) ?? NULL_RATINGS),
      });
    }

    const total = orderedFull.length;
    const start = (opts.page - 1) * opts.limit;
    const page = orderedFull.slice(start, start + opts.limit);
    return [page, total, facets];
  }

  async findProduct(
    tenantId: string,
    id: string,
  ): Promise<PublicSiteProductDetail | null> {
    const now = new Date();
    const row = await prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        imsCode: true,
        mrp: true,
        finalSp: true,
        length: true,
        breadth: true,
        height: true,
        weight: true,
        categoryId: true,
        subCategory: true,
        dateCreated: true,
        category: { select: { id: true, name: true } },
        discounts: {
          where: activeDiscountWhere(now),
          select: { id: true },
          take: 1,
        },
        // Full active-variation set so the PDP buybox can render a chip
        // picker grouped by attribute type. Attributes + sub-variations
        // join through; photos are flattened to URL strings to keep the
        // wire shape compact. Per-variation photos are capped to match
        // the PDP gallery (keeps the wire payload small on listings with
        // dozens of lifestyle shots per SKU).
        variations: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            finalSpOverride: true,
            mrpOverride: true,
            stockQuantity: true,
            photos: {
              orderBy: [{ isPrimary: "desc" }, { uploadDate: "asc" }],
              take: PDP_PHOTO_CAP,
              select: { photoUrl: true },
            },
            attributes: {
              select: {
                attributeType: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    displayOrder: true,
                  },
                },
                attributeValue: {
                  select: { id: true, value: true, displayOrder: true },
                },
              },
            },
            subVariations: {
              orderBy: { name: "asc" },
              select: { id: true, name: true },
            },
          },
        },
      },
    });
    if (!row) return null;

    // First active variation's photos drive the base gallery (matches
    // the pre-variations contract). Variation-specific photos are also
    // exposed per variation so the PDP can swap the gallery when a chip
    // is picked.
    const firstVariation = row.variations[0];
    const photoUrls = firstVariation?.photos.map((p) => p.photoUrl) ?? [];

    const variations: PublicSiteVariation[] = row.variations.map((v) => {
      const price = v.finalSpOverride ?? row.finalSp;
      const variationMrp = v.mrpOverride ?? row.mrp;
      const attributes: PublicSiteVariationAttribute[] = v.attributes
        .slice()
        .sort(
          (a, b) => a.attributeType.displayOrder - b.attributeType.displayOrder,
        )
        .map((a) => ({
          typeId: a.attributeType.id,
          typeName: a.attributeType.name,
          typeCode: a.attributeType.code,
          valueId: a.attributeValue.id,
          value: a.attributeValue.value,
        }));
      // Cheap human-readable name: "Red / M" or the product's base name
      // when no attributes are defined.
      const name =
        attributes.length > 0
          ? attributes.map((a) => a.value).join(" / ")
          : row.name;
      return {
        id: v.id,
        name,
        sku: null,
        finalSp: price.toString(),
        mrp: variationMrp.toString(),
        stockQuantity: v.stockQuantity,
        attributes,
        subVariations: v.subVariations,
        photoUrls: v.photos.map((p) => p.photoUrl),
      };
    });

    const stats = priceStats(
      row.variations.map((v) => ({
        finalSpOverride: v.finalSpOverride,
        mrpOverride: v.mrpOverride,
        photos: v.photos,
      })),
      row.finalSp,
    );

    const ratings = await this.loadRatingForProduct(tenantId, row.id);

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      imsCode: row.imsCode,
      mrp: row.mrp.toString(),
      finalSp: row.finalSp.toString(),
      length: row.length,
      breadth: row.breadth,
      height: row.height,
      weight: row.weight,
      categoryId: row.categoryId,
      subCategory: row.subCategory,
      dateCreated: row.dateCreated,
      category: row.category,
      photoUrl: photoUrls[0] ?? null,
      photoUrls,
      variations,
      ...stats,
      ...deriveDiscount(row.mrp, row.finalSp, row.discounts.length > 0),
      ...ratings,
    };
  }

  async listCategories(tenantId: string): Promise<
    {
      id: string;
      name: string;
      description: string | null;
      productCount: number;
    }[]
  > {
    const rows = await prisma.category.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      productCount: r._count.products,
    }));
  }

  /**
   * Fetch the products of a collection in the admin-curated order.
   * Uses the join-table `position` for ordering — which Prisma can't
   * express directly inside product.findMany — so we load the ordered
   * productIds first and then pull the product rows in a second query,
   * re-ordering in JS.
   */
  async listCollectionProducts(
    tenantId: string,
    collectionId: string,
    limit: number,
  ): Promise<PublicSiteProduct[]> {
    const joinRows = await prisma.productCollection.findMany({
      where: { collectionId },
      orderBy: { position: "asc" },
      take: limit,
      select: { productId: true, position: true },
    });
    if (joinRows.length === 0) return [];

    const productIds = joinRows.map((r) => r.productId);
    const now = new Date();
    const rows = await prisma.product.findMany({
      where: { tenantId, deletedAt: null, id: { in: productIds } },
      select: {
        id: true,
        name: true,
        imsCode: true,
        mrp: true,
        finalSp: true,
        categoryId: true,
        dateCreated: true,
        category: { select: { id: true, name: true } },
        ...LIST_VARIATION_SELECT,
        discounts: {
          where: activeDiscountWhere(now),
          select: { id: true },
          take: 1,
        },
      },
    });

    const byId = new Map(rows.map((r) => [r.id, r]));
    const ratings = await this.loadRatingsByProduct(
      tenantId,
      rows.map((r) => r.id),
    );
    const ordered: PublicSiteProduct[] = [];
    for (const j of joinRows) {
      const r = byId.get(j.productId);
      if (!r) continue;
      ordered.push({
        id: r.id,
        name: r.name,
        imsCode: r.imsCode,
        mrp: r.mrp.toString(),
        finalSp: r.finalSp.toString(),
        categoryId: r.categoryId,
        dateCreated: r.dateCreated,
        category: r.category,
        photoUrl: primaryPhotoFromList(r.variations),
        ...priceStats(r.variations, r.finalSp),
        ...deriveDiscount(r.mrp, r.finalSp, r.discounts.length > 0),
        ...(ratings.get(r.id) ?? NULL_RATINGS),
      });
    }
    return ordered;
  }

  /**
   * Public product reviews — APPROVED + not-deleted only. The repository is
   * the only layer that talks to `productReview`, so the public surface
   * cannot accidentally leak PENDING or REJECTED rows.
   */
  async listApprovedReviews(
    tenantId: string,
    productId: string,
    page: number,
    limit: number,
  ): Promise<{
    rows: {
      id: string;
      rating: number;
      body: string | null;
      authorName: string | null;
      createdAt: Date;
    }[];
    total: number;
  }> {
    const where = {
      tenantId,
      productId,
      status: "APPROVED" as const,
      deletedAt: null,
    };
    const [rows, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          rating: true,
          body: true,
          authorName: true,
          createdAt: true,
        },
      }),
      prisma.productReview.count({ where }),
    ]);
    return { rows, total };
  }

  /**
   * Verify that a product exists (non-deleted, in this tenant) before the
   * service accepts a public review submission. Returns just the id so the
   * submit path can avoid an extra hydration round-trip.
   */
  findProductIdForTenant(
    tenantId: string,
    productId: string,
  ): Promise<{ id: string } | null> {
    return prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
      select: { id: true },
    });
  }

  /**
   * Aggregate APPROVED reviews for a batch of productIds in a single
   * groupBy round-trip. Returns a Map keyed by productId so callers can
   * overlay ratings onto the row payload without a second query per row.
   * Products with zero APPROVED reviews are absent from the Map — the
   * caller falls back to NULL_RATINGS.
   */
  async loadRatingsByProduct(
    tenantId: string,
    productIds: string[],
  ): Promise<
    Map<string, { avgRating: number | null; ratingCount: number | null }>
  > {
    const map = new Map<
      string,
      { avgRating: number | null; ratingCount: number | null }
    >();
    if (productIds.length === 0) return map;
    const grouped = await prisma.productReview.groupBy({
      by: ["productId"],
      where: {
        tenantId,
        productId: { in: productIds },
        status: "APPROVED",
        deletedAt: null,
      },
      _avg: { rating: true },
      _count: { rating: true },
    });
    for (const row of grouped) {
      const avg = row._avg.rating;
      const count = row._count.rating ?? 0;
      if (count === 0) continue;
      map.set(row.productId, {
        avgRating: avg !== null ? Math.round(avg * 10) / 10 : null,
        ratingCount: count,
      });
    }
    return map;
  }

  /**
   * Single-product rating aggregate — used by findProduct so the PDP gets
   * the real average without a batch groupBy. Returns null-rating when
   * the product has no APPROVED reviews yet.
   */
  async loadRatingForProduct(
    tenantId: string,
    productId: string,
  ): Promise<{ avgRating: number | null; ratingCount: number | null }> {
    const agg = await prisma.productReview.aggregate({
      where: {
        tenantId,
        productId,
        status: "APPROVED",
        deletedAt: null,
      },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const count = agg._count.rating ?? 0;
    if (count === 0) return { ...NULL_RATINGS };
    const avg = agg._avg.rating;
    return {
      avgRating: avg !== null ? Math.round(avg * 10) / 10 : null,
      ratingCount: count,
    };
  }

  createPendingReview(
    tenantId: string,
    input: {
      productId: string;
      rating: number;
      body: string | null;
      authorName: string | null;
      authorEmail: string | null;
      submittedIp: string | null;
    },
  ): Promise<{ id: string; status: "PENDING" | "APPROVED" | "REJECTED" }> {
    return prisma.productReview
      .create({
        data: {
          tenantId,
          productId: input.productId,
          rating: input.rating,
          body: input.body,
          authorName: input.authorName,
          authorEmail: input.authorEmail,
          submittedIp: input.submittedIp,
          status: "PENDING",
        },
        select: { id: true, status: true },
      })
      .then((r) => ({
        id: r.id,
        status: r.status as "PENDING" | "APPROVED" | "REJECTED",
      }));
  }
}

export default new PublicSiteRepository();
