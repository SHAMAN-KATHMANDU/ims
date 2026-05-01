# Public Data API

> Read-only HTTP API for tenant-owned product, catalog, blog, page, bundle and
> site-layout data. Designed for **third-party frontends** running on a
> customer's own infrastructure (Next.js, Astro, plain React, static sites,
> mobile apps) that want raw JSON instead of using the built-in
> `apps/tenant-site` renderer.

**Base URL** — `https://<your-api-host>/api/v1`
**Surface** — `/public/v1/*` (consumer-facing reads) + `/public-api-keys` (admin CRUD)
**Auth** — Tenant-issued API key, bound to a DNS-verified domain
**Method** — `GET` only (`POST`/`PUT`/`PATCH`/`DELETE` return 405)
**Feature flag** — `EnvFeature.PUBLIC_DATA_API` (returns 404 when off)

> **First time wiring up a frontend?** See the step-by-step
> [Frontend Setup Guide](./PUBLIC-DATA-API-FRONTEND-SETUP.md) for env vars,
> framework examples (Next.js, Astro), CORS during local dev, and a
> reusable client snippet. This document is the API reference.

---

## Table of contents

1. [How auth works](#1-how-auth-works)
2. [Issuing and managing keys (admin API)](#2-issuing-and-managing-keys-admin-api)
3. [Calling the Public Data API](#3-calling-the-public-data-api)
4. [Standard error responses](#4-standard-error-responses)
5. [Endpoint reference](#5-endpoint-reference)
   - [Site](#51-site)
   - [Products](#52-products)
   - [Categories, offers, collections](#53-categories-offers-collections)
   - [Bundles](#54-bundles)
   - [Blog](#55-blog)
   - [Pages](#56-pages)
6. [Rate limits](#6-rate-limits)
7. [Response envelope conventions](#7-response-envelope-conventions)
8. [Versioning and stability](#8-versioning-and-stability)

---

## 1. How auth works

The Public Data API is authenticated by an **API key bound to a domain you own**.
The flow has two halves:

### A. Prove you own the domain (one-time, DNS TXT)

1. In Site Management → Domains, **add the hostname** you'll serve your
   frontend from (e.g. `shop.acme.com`).
2. The system gives you a TXT record to publish:
   ```
   _shaman.shop.acme.com   TXT   shaman-verify=<token>
   ```
3. Click **Verify**. The server resolves the TXT record and stamps
   `verifiedAt` on the domain. **Required before a key can be issued.**

### B. Issue an API key for that domain

Once verified, issue a key in Site Management → Public API keys. The full key
string is shown **once**:

```
pk_live_a1b2c3d4_4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b
└──┬──┘ └───┬───┘ └───────────────┬───────────────┘
   │       │                      │
   prefix  lookup id              secret (bcrypt-hashed at rest)
```

Store the full string in your frontend's environment (e.g. `PROJECTX_API_KEY`).
The server keeps only the prefix (for lookup) and a bcrypt hash of the secret.
**There is no retrieval; rotate or revoke and reissue if you lose it.**

### C. Send requests with two required headers

```http
GET /api/v1/public/v1/products HTTP/1.1
Host: api.projectx.example
Authorization: Bearer pk_live_a1b2c3d4_4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b
Origin: https://shop.acme.com
```

Both are mandatory:

| Header                            | Purpose                      | Failure mode       |
| --------------------------------- | ---------------------------- | ------------------ |
| `Authorization: Bearer pk_live_…` | Identifies the tenant + key  | `401 Unauthorized` |
| `Origin: https://<verified-host>` | CORS pin to the bound domain | `403 Forbidden`    |

The `Origin` host (e.g. `shop.acme.com`) **must equal** the hostname the key
is bound to (case-insensitive). Even if a key is exfiltrated, browser
requests from any other origin are rejected.

### D. CORS

The server reflects the matched `Origin` back as
`Access-Control-Allow-Origin` and sets `Vary: Origin`. **Wildcard `*` is
never returned**, and `Access-Control-Allow-Credentials` is always `false`.

---

## 2. Issuing and managing keys (admin API)

These endpoints are JWT-authenticated (a tenant admin's normal session token)
and live under `/api/v1/public-api-keys`. They are NOT public — they are how
your tenant admins issue keys for use elsewhere.

All admin endpoints return the modern envelope:

```json
{ "success": true, "data": { ... } }
```

or on error:

```json
{ "success": false, "message": "..." }
```

### POST `/public-api-keys` — issue a new key

**Request**

```http
POST /api/v1/public-api-keys
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "name": "shop.acme.com production",
  "tenantDomainId": "8a6b…uuid",
  "rateLimitPerMin": 240
}
```

| Field             | Type            | Required | Notes                                                              |
| ----------------- | --------------- | -------- | ------------------------------------------------------------------ |
| `name`            | string (1..100) | yes      | Human-readable label                                               |
| `tenantDomainId`  | uuid            | yes      | Must reference one of your tenant's domains, with `verifiedAt` set |
| `rateLimitPerMin` | int 1..10000    | no       | Default `120`                                                      |

**Response — 201 Created**

```json
{
  "success": true,
  "data": {
    "key": "pk_live_a1b2c3d4_4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b",
    "apiKey": {
      "id": "1c8a…uuid",
      "name": "shop.acme.com production",
      "prefix": "pk_live_a1b2c3d4",
      "last4": "8a9b",
      "rateLimitPerMin": 240,
      "allowedDomain": {
        "id": "8a6b…uuid",
        "hostname": "shop.acme.com",
        "verifiedAt": "2026-04-22T10:13:55.221Z"
      },
      "createdAt": "2026-05-01T18:42:01.000Z",
      "lastUsedAt": null,
      "revokedAt": null
    }
  }
}
```

**`data.key` is the full secret string. It is shown ONCE. Future GETs return
only `prefix` + `last4`.**

| Status | When                                        |
| ------ | ------------------------------------------- |
| 201    | Issued                                      |
| 400    | Validation error or domain not DNS-verified |
| 404    | Tenant domain not found / not yours         |
| 401    | Missing or invalid JWT                      |

### GET `/public-api-keys` — list

```http
GET /api/v1/public-api-keys
Authorization: Bearer <jwt>
```

```json
{
  "success": true,
  "data": {
    "apiKeys": [
      {
        "id": "1c8a…uuid",
        "name": "shop.acme.com production",
        "prefix": "pk_live_a1b2c3d4",
        "last4": "8a9b",
        "rateLimitPerMin": 240,
        "allowedDomain": {
          "id": "8a6b…uuid",
          "hostname": "shop.acme.com",
          "verifiedAt": "2026-04-22T10:13:55.221Z"
        },
        "createdAt": "2026-05-01T18:42:01.000Z",
        "lastUsedAt": "2026-05-01T19:01:14.500Z",
        "revokedAt": null
      }
    ]
  }
}
```

The `hash` is **never** returned. Active and revoked keys are both included;
revoked keys carry a non-null `revokedAt`.

### POST `/public-api-keys/:id/rotate` — replace a key

```http
POST /api/v1/public-api-keys/1c8a…uuid/rotate
Authorization: Bearer <jwt>
```

```json
{
  "success": true,
  "data": {
    "key": "pk_live_99887766_aabbccddeeff00112233445566778899",
    "apiKey": {
      /* new key view */
    },
    "revokedId": "1c8a…uuid"
  }
}
```

The old key is revoked atomically; the new one is bound to the same domain
with the same `rateLimitPerMin`. The new full key string is shown once.

### DELETE `/public-api-keys/:id` — revoke

```http
DELETE /api/v1/public-api-keys/1c8a…uuid
Authorization: Bearer <jwt>
```

```json
{
  "success": true,
  "data": {
    "id": "1c8a…uuid",
    "revokedAt": "2026-05-01T19:30:00.000Z"
  }
}
```

Revoked keys cannot be unrevoked. Issue a new one.

---

## 3. Calling the Public Data API

All consumer endpoints live under `/api/v1/public/v1/*`. Examples below
omit the `/api/v1` mount prefix for brevity.

### Minimal `curl`

```bash
curl https://api.projectx.example/api/v1/public/v1/products?limit=5 \
  -H "Authorization: Bearer pk_live_a1b2c3d4_4e5f…8a9b" \
  -H "Origin: https://shop.acme.com"
```

### Browser fetch (your own frontend)

```ts
const res = await fetch(
  "https://api.projectx.example/api/v1/public/v1/products?limit=5",
  {
    headers: {
      Authorization: `Bearer ${process.env.PROJECTX_API_KEY!}`,
      // The browser sets Origin automatically; do not override.
    },
    // Do NOT set credentials: "include" — keys are opaque tokens, not cookies.
  },
);
const data = await res.json();
```

### Server-to-server fetch

If you call from a backend (no browser), set `Origin` explicitly to the
bound hostname:

```ts
await fetch(`${BASE}/public/v1/products`, {
  headers: {
    Authorization: `Bearer ${process.env.PROJECTX_API_KEY!}`,
    Origin: "https://shop.acme.com",
  },
});
```

---

## 4. Standard error responses

All consumer responses use a permissive envelope to stay backwards
compatible with existing public controllers. **Successful responses include
a `message: "OK"` string plus payload fields at the top level.** Errors set
the appropriate status code and return a `{ message }` body.

| Status | Meaning                                                     | Example body                                                                                           |
| ------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 200    | Success                                                     | `{ "message": "OK", "products": [...] }`                                                               |
| 400    | Validation / malformed query                                | `{ "message": "limit must be ≤ 100" }`                                                                 |
| 401    | Missing / invalid / revoked API key                         | `{ "success": false, "message": "Invalid or missing API key" }`                                        |
| 403    | `Origin` does not match bound domain                        | `{ "success": false, "message": "Request origin does not match the API key's bound domain" }`          |
| 404    | Resource not found, site not published, or feature flag off | `{ "message": "Product not found" }`                                                                   |
| 405    | Non-GET method on `/public/v1/*`                            | `{ "success": false, "message": "The Public Data API is read-only — only GET requests are allowed." }` |
| 429    | Per-key rate limit exceeded                                 | `{ "success": false, "message": "Rate limit exceeded for this API key. Try again shortly." }`          |
| 500    | Server error                                                | `{ "message": "Something went wrong. Please try again." }`                                             |

> 401/403/405/429 use the `{ success, message }` envelope (modern shape) because
> they are produced by the new middleware chain. 400/404/500 from re-used
> public controllers use the legacy `{ message }` shape. Treat any non-2xx
> as an error and read `message` (which is always present).

---

## 5. Endpoint reference

### 5.1 Site

#### `GET /public/v1/site`

Returns the published site config (branding, theme tokens, contact info,
SEO defaults).

**Response 200**

```json
{
  "message": "OK",
  "site": {
    "name": "Acme Co.",
    "tagline": "Curated essentials",
    "branding": {
      "logoUrl": "https://…",
      "colors": {
        "primary": "#1a1a2e",
        "secondary": "#4a4a6a",
        "accent": "#f0ebe3"
      }
    },
    "themeTokens": {
      "mode": "light",
      "typography": { "fontFamily": "Georgia, serif", "baseFontSize": 16 }
    },
    "contact": {
      "email": "hello@acme.com",
      "phone": "+1-555-0100",
      "address": "…",
      "socials": { "instagram": "@acme" }
    },
    "seo": {
      "title": "Acme — Curated essentials",
      "description": "…",
      "ogImage": "https://…"
    },
    "currency": "USD",
    "locales": ["en"],
    "defaultLocale": "en"
  }
}
```

404 if the site isn't published or the feature flag is off.

---

### 5.2 Products

#### `GET /public/v1/products`

Paginated list of published products.

**Query params**

| Param           | Type       | Default  | Notes                                                  |
| --------------- | ---------- | -------- | ------------------------------------------------------ |
| `page`          | int ≥ 1    | 1        |                                                        |
| `limit`         | int 1..100 | 24       | Hard cap 100                                           |
| `categoryId`    | uuid       | —        | Filter by category                                     |
| `search`        | string     | —        | Free text                                              |
| `sort`          | enum       | `newest` | `newest` \| `price_asc` \| `price_desc` \| `relevance` |
| `minPrice`      | number     | —        | Inclusive                                              |
| `maxPrice`      | number     | —        | Inclusive                                              |
| `vendorId`      | uuid       | —        |                                                        |
| `attr`          | string     | —        | Variation attribute filter (e.g. `color:red`)          |
| `includeFacets` | bool       | `false`  | Adds `facets: { brand, priceRange, attributes }`       |

**Response 200**

```json
{
  "message": "OK",
  "products": [
    {
      "id": "ab12…uuid",
      "name": "Linen shirt",
      "slug": "linen-shirt",
      "price": 79.0,
      "compareAtPrice": 99.0,
      "currency": "USD",
      "thumbnailUrl": "https://…",
      "categoryId": "c1…uuid",
      "vendorId": null,
      "variations": [
        /* … */
      ],
      "createdAt": "2026-04-01T00:00:00.000Z"
    }
  ],
  "total": 142,
  "page": 1,
  "limit": 24,
  "facets": null
}
```

#### `GET /public/v1/products/:id`

```json
{
  "message": "OK",
  "product": {
    "id": "ab12…uuid",
    "name": "Linen shirt",
    "description": "…",
    "images": ["https://…"],
    "variations": [
      {
        "id": "v1…",
        "sku": "LIN-RED-M",
        "price": 79.0,
        "stock": 12,
        "attributes": { "color": "red", "size": "M" }
      }
    ],
    "category": { "id": "c1…", "name": "Tops" },
    "tags": ["summer", "linen"]
  }
}
```

404 if the product is missing, soft-deleted, or the site isn't published.

#### `GET /public/v1/products/:id/reviews`

**Query**: `page` (≥1), `limit` (1..50, default 10).

```json
{
  "message": "OK",
  "reviews": [
    {
      "id": "r1…uuid",
      "rating": 5,
      "title": "Beautiful fabric",
      "body": "Worth the price.",
      "authorName": "Jane",
      "createdAt": "2026-04-25T10:14:11.000Z"
    }
  ],
  "total": 18,
  "page": 1,
  "limit": 10
}
```

Only `APPROVED` reviews are returned, newest first.

#### `GET /public/v1/products/:id/frequently-bought-with`

Up to 10 co-purchased products from the trailing 180 days, ordered by
distinct-sale count.

```json
{
  "message": "OK",
  "products": [
    {
      "id": "p2…",
      "name": "Linen trousers",
      "thumbnailUrl": "https://…",
      "price": 95.0,
      "coPurchaseCount": 7
    }
  ]
}
```

---

### 5.3 Categories, offers, collections

#### `GET /public/v1/categories`

```json
{
  "message": "OK",
  "categories": [
    {
      "id": "c1…",
      "slug": "tops",
      "name": "Tops",
      "productCount": 24,
      "imageUrl": null
    }
  ]
}
```

#### `GET /public/v1/offers`

Same shape as `/products` (paginated), filtered to products on an active
discount.

#### `GET /public/v1/collections/:slug`

**Query**: `limit` (1..100, default 24).

```json
{
  "message": "OK",
  "collection": {
    "slug": "summer-essentials",
    "title": "Summer Essentials",
    "subtitle": "Lightweight picks for warm days",
    "products": [
      /* product summary array */
    ]
  }
}
```

404 if the collection is inactive or missing.

---

### 5.4 Bundles

#### `GET /public/v1/bundles`

```json
{
  "message": "OK",
  "bundles": [
    {
      "id": "b1…",
      "slug": "starter-kit",
      "title": "Starter Kit",
      "price": 149.0,
      "items": [
        /* product refs */
      ]
    }
  ]
}
```

#### `GET /public/v1/bundles/:slug`

```json
{
  "message": "OK",
  "bundle": {
    "id": "b1…",
    "slug": "starter-kit",
    "title": "Starter Kit",
    "description": "…",
    "price": 149.0,
    "compareAtPrice": 180.0,
    "items": [
      {
        "productId": "p1…",
        "name": "Linen shirt",
        "quantity": 1,
        "thumbnailUrl": "https://…"
      }
    ]
  }
}
```

---

### 5.5 Blog

#### `GET /public/v1/blog/posts`

**Query**: `page`, `limit`, `categorySlug`, `tag`, `q` (search).

```json
{
  "message": "OK",
  "posts": [
    {
      "id": "bp1…",
      "slug": "summer-launch",
      "title": "Summer launch",
      "excerpt": "Three pieces we love.",
      "heroImageUrl": "https://…",
      "authorName": "Editorial",
      "category": { "slug": "news", "name": "News" },
      "tags": ["editorial"],
      "publishedAt": "2026-04-30T09:00:00.000Z",
      "readingMinutes": 4
    }
  ],
  "total": 17,
  "page": 1,
  "limit": 10
}
```

#### `GET /public/v1/blog/featured`

**Query**: `limit` (1..10, default 4).

```json
{
  "message": "OK",
  "posts": [
    /* same post shape as above */
  ]
}
```

#### `GET /public/v1/blog/categories`

```json
{
  "message": "OK",
  "categories": [
    { "slug": "news", "name": "News", "description": null, "postCount": 12 }
  ]
}
```

#### `GET /public/v1/blog/posts/:slug`

```json
{
  "message": "OK",
  "post": {
    "id": "bp1…",
    "slug": "summer-launch",
    "title": "Summer launch",
    "excerpt": "Three pieces we love.",
    "bodyMarkdown": "## Heading\\n\\nBody text…",
    "heroImageUrl": "https://…",
    "authorName": "Editorial",
    "category": { "slug": "news", "name": "News" },
    "tags": ["editorial"],
    "seoTitle": "Summer launch — Acme",
    "seoDescription": "…",
    "publishedAt": "2026-04-30T09:00:00.000Z",
    "readingMinutes": 4
  },
  "related": [
    /* up to 4 sibling-category posts */
  ]
}
```

---

### 5.6 Pages

Custom tenant pages — About, FAQ, Lookbook, etc.

#### `GET /public/v1/pages`

```json
{
  "message": "OK",
  "pages": [
    {
      "slug": "about",
      "title": "About us",
      "publishedAt": "2026-04-01T00:00:00.000Z"
    }
  ]
}
```

#### `GET /public/v1/pages/:slug`

```json
{
  "message": "OK",
  "page": {
    "slug": "about",
    "title": "About us",
    "bodyMarkdown": "…",
    "seoTitle": null,
    "seoDescription": null,
    "publishedAt": "2026-04-01T00:00:00.000Z"
  }
}
```

---

## 6. Rate limits

- Per-key sliding window, `windowMs = 60_000ms` (1 minute).
- Default `max = 120` requests / minute. Override per key via `rateLimitPerMin`
  on issue (1..10000).
- Limit is keyed on the **API key id**, not the IP. Sharing one key across
  many clients shares the budget.
- `429 Too Many Requests` includes the standard
  `RateLimit-*` / `Retry-After` headers.

---

## 7. Response envelope conventions

| Surface                                            | Envelope                                                        | Reason                                                                                                      |
| -------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/public-api-keys` (admin)                         | `{ success, data }` / `{ success, message }`                    | Modern `ok()` / `fail()` helpers                                                                            |
| `/public/v1/*` (consumer)                          | `{ message: "OK", …payload }` for 200; `{ message }` for errors | Re-uses existing public controllers — kept verbatim to preserve compatibility with the tenant-site renderer |
| `/public/v1/*` middleware errors (401/403/405/429) | `{ success: false, message }`                                   | Produced by the new middleware chain                                                                        |

If you write a generic client, treat any 2xx as success and read whichever
top-level field carries the payload (`products`, `post`, `site`, …); on
non-2xx, read `message`.

---

## 8. Versioning and stability

- The mount path includes `/v1`. Breaking changes will land on `/v2`; `/v1`
  stays backwards-compatible per the project's `backwards-compatibility` rule.
- Adding new optional fields, new endpoints, or new query params is
  considered additive and ships without a version bump.
- Removing or renaming response fields, removing endpoints, or changing
  status-code semantics requires a new version.

---

## Appendix A — Full curl walkthrough

```bash
# 1. Log in as a tenant admin to get a JWT.
JWT=$(curl -s https://api.projectx.example/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"…","tenantSlug":"acme"}' | jq -r .token)

# 2. List your verified domains.
curl -s https://api.projectx.example/api/v1/tenants/me/domains \
  -H "Authorization: Bearer $JWT" | jq

# 3. Issue an API key for a verified domain.
KEY_RESPONSE=$(curl -s https://api.projectx.example/api/v1/public-api-keys \
  -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' \
  -d '{"name":"shop production","tenantDomainId":"<uuid>"}')
echo "$KEY_RESPONSE" | jq
API_KEY=$(echo "$KEY_RESPONSE" | jq -r .data.key)

# 4. Use the key to read products.
curl -s "https://api.projectx.example/api/v1/public/v1/products?limit=3" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Origin: https://shop.acme.com" | jq

# 5. Wrong origin — should 403.
curl -i "https://api.projectx.example/api/v1/public/v1/products" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Origin: https://evil.com"

# 6. Mutation — should 405.
curl -i -X POST "https://api.projectx.example/api/v1/public/v1/products" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Origin: https://shop.acme.com"

# 7. Rotate.
curl -s -X POST https://api.projectx.example/api/v1/public-api-keys/<key-id>/rotate \
  -H "Authorization: Bearer $JWT" | jq

# 8. Revoke.
curl -s -X DELETE https://api.projectx.example/api/v1/public-api-keys/<key-id> \
  -H "Authorization: Bearer $JWT"
```

---

## Appendix B — TypeScript client snippet

```ts
const API_BASE = "https://api.projectx.example/api/v1";
const API_KEY = process.env.PROJECTX_API_KEY!;
const ORIGIN = "https://shop.acme.com";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/public/v1${path}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Origin: ORIGIN, // server-to-server only; browsers set this for you
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

interface ProductList {
  message: "OK";
  products: Array<{ id: string; name: string; price: number }>;
  total: number;
  page: number;
  limit: number;
}

const list = await get<ProductList>("/products?limit=10");
console.log(list.total, list.products.length);
```

---

_Last updated: 2026-05-01 — for the `feat/public-data-api` branch._
