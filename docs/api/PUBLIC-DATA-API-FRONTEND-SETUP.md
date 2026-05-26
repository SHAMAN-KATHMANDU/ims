# Public Data API — Frontend Setup Guide

> Companion to [`PUBLIC-DATA-API.md`](./PUBLIC-DATA-API.md). This guide is the
> step-by-step a customer follows to wire **their own frontend** (Next.js,
> Astro, plain React, static site — anything) to the Public Data API.

---

## 1. One-time setup in your projectX dashboard

1. **Add your frontend's hostname** in Site Management → Domains. Use the
   exact host you'll deploy to: `shop.acme.com`, `www.example.com`,
   `app.acme.io`.
2. **Add the DNS TXT record** the dashboard shows you:
   ```
   _shaman.shop.acme.com   TXT   shaman-verify=<token>
   ```
   Wait for propagation (usually < 5 min, sometimes longer), then click
   **Verify**. The domain gets a `verifiedAt` timestamp.
3. **Issue an API key** in the Public API keys section (right under Domains).
   Pick the verified domain, give it a name, optionally set a per-minute rate
   limit. **Copy the full `pk_live_…` string immediately — it's shown only
   once.**

---

## 2. Configure your frontend project

### Environment variable

Put the key in your frontend's env (use whatever your stack calls
server-side env):

```bash
# .env.local (Next.js), .env (Astro/Vite), etc.
PROJECTX_API_KEY=pk_live_a1b2c3d4_4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b
PROJECTX_API_BASE=https://api.projectx.example/api/v1
```

> **Don't** prefix it with `NEXT_PUBLIC_` / `VITE_` / `PUBLIC_`. The key must
> stay server-side. Browser-leaked keys are useless against another origin
> (the Origin pin protects you), but treat it as a credential anyway —
> rotate if exposed.

### Where the key lives matters

| You're doing…                                                                              | Where to put the key                                                                                                                                         |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Next.js App Router server components, route handlers, Server Actions, `getServerSideProps` | **Server-side env** (`process.env.PROJECTX_API_KEY`). Call the API from the server, return data to the client. ✅ Recommended.                               |
| Astro / Remix / SvelteKit loaders                                                          | Same — call from the loader (server).                                                                                                                        |
| Pure SPA (CRA / Vite-React, no backend)                                                    | You can't fully hide the key. The Origin pin still protects you, but anyone viewing the bundle can read it. Acceptable for read-only public data; not ideal. |
| Mobile app                                                                                 | Use a thin backend or edge proxy; embedding the key in the binary leaks it.                                                                                  |

---

## 3. Make a request

Two headers are required, every time:

```http
Authorization: Bearer pk_live_a1b2c3d4_4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b
Origin: https://shop.acme.com
```

- **Browsers set `Origin` automatically** — don't set it yourself.
- **Server-to-server callers must set `Origin` explicitly** to the verified
  hostname.

### Next.js example (server component)

```ts
// app/products/page.tsx
const BASE = process.env.PROJECTX_API_BASE!;
const KEY = process.env.PROJECTX_API_KEY!;

async function getProducts() {
  const res = await fetch(`${BASE}/public/v1/products?limit=24`, {
    headers: {
      Authorization: `Bearer ${KEY}`,
      Origin: "https://shop.acme.com", // server-to-server: required
    },
    next: { revalidate: 60 }, // cache 60s on the edge
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export default async function Page() {
  const { products, total } = await getProducts();
  return <ProductGrid products={products} total={total} />;
}
```

### Astro example

```astro
---
const res = await fetch(`${import.meta.env.PROJECTX_API_BASE}/public/v1/products`, {
  headers: {
    Authorization: `Bearer ${import.meta.env.PROJECTX_API_KEY}`,
    Origin: "https://shop.acme.com",
  },
});
const { products } = await res.json();
---
<ul>{products.map(p => <li>{p.name} — {p.price}</li>)}</ul>
```

### Browser fetch (only if you have to)

```ts
const res = await fetch(`${BASE}/public/v1/products`, {
  headers: { Authorization: `Bearer ${KEY}` },
  // do NOT set credentials: "include" — keys are bearer tokens, not cookies
});
```

The browser auto-sets `Origin` to your page's origin. As long as your page
is hosted on the verified domain, it'll match.

---

## 4. CORS — what to expect

The server only accepts requests where the `Origin` header host matches
your bound domain (case-insensitive). On match, it sets:

```
Access-Control-Allow-Origin: https://shop.acme.com
Vary: Origin
Access-Control-Allow-Credentials: false
```

So:

- ✅ Fetch from `https://shop.acme.com` — works.
- ❌ Fetch from `https://localhost:3000` during dev — **403**. To develop
  locally, either (a) use server-side fetches and set
  `Origin: https://shop.acme.com` explicitly, or (b) issue a separate dev
  key bound to a `localhost`-style verified domain.
- ❌ Fetch with `credentials: "include"` — browser will reject because we
  return `Allow-Credentials: false`.

---

## 5. Useful endpoints

All under `${PROJECTX_API_BASE}/public/v1/`:

| Resource                           | Path                                                            |
| ---------------------------------- | --------------------------------------------------------------- |
| Site config (branding, theme, SEO) | `GET /site`                                                     |
| Products list                      | `GET /products?page=1&limit=24&search=&categoryId=&sort=newest` |
| Single product                     | `GET /products/:id`                                             |
| Product reviews                    | `GET /products/:id/reviews`                                     |
| Categories                         | `GET /categories`                                               |
| On-offer products                  | `GET /offers`                                                   |
| Curated collection                 | `GET /collections/:slug`                                        |
| Bundles                            | `GET /bundles`, `GET /bundles/:slug`                            |
| Blog post list                     | `GET /blog/posts?page=1&limit=10`                               |
| Single blog post                   | `GET /blog/posts/:slug`                                         |
| Featured posts                     | `GET /blog/featured`                                            |
| Blog categories                    | `GET /blog/categories`                                          |
| Custom pages                       | `GET /pages`, `GET /pages/:slug`                                |

Full request/response shapes: [`PUBLIC-DATA-API.md`](./PUBLIC-DATA-API.md).

---

## 6. Reusable client (recommended)

Centralize the headers in one file:

```ts
// lib/projectx.ts
const BASE = process.env.PROJECTX_API_BASE!;
const KEY = process.env.PROJECTX_API_KEY!;
const ORIGIN = process.env.PROJECTX_ORIGIN ?? "https://shop.acme.com";

export async function projectx<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}/public/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${KEY}`,
      Origin: ORIGIN, // safe to always set on the server
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Usage:
const { products } = await projectx<{ products: Product[] }>(
  "/products?limit=24",
);
```

---

## 7. Failure modes — quick decoder

| You see                                | Likely cause                                    | Fix                                                                                                             |
| -------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `401 Invalid or missing API key`       | Header missing, malformed, key revoked, or typo | Verify `Authorization: Bearer pk_live_…` is set; reissue if revoked                                             |
| `403 Request origin does not match…`   | `Origin` doesn't match the bound hostname       | Pass the exact hostname you verified; `https://` vs `http://` doesn't matter (host-only) but `www.` prefix does |
| `404 feature_not_available`            | `PUBLIC_DATA_API` flag is off in this env       | Wait for prod ramp, or use a non-prod env                                                                       |
| `405 The Public Data API is read-only` | You sent a non-GET request                      | Only `GET` (and `HEAD` / `OPTIONS`) are allowed                                                                 |
| `429 Rate limit exceeded`              | Burst exceeded `rateLimitPerMin` for that key   | Back off, or increase the limit when issuing                                                                    |

---

## 8. Operational notes

- **Cache aggressively.** Most product/blog data changes infrequently; use
  `next: { revalidate: 60 }`, CDN cache, or your framework's data cache to
  stay well under rate limits.
- **One key per environment.** Issue separate keys for production / staging
  / dev, each bound to its respective verified domain. Rotate independently.
- **Rotate, don't share.** If a key leaks, hit Rotate in the dashboard —
  old key is revoked, new one shown once.
- **Watch `lastUsedAt`** in the Site Management UI to spot keys that are no
  longer in use; revoke them.

---

## TL;DR

1. Verify your domain (DNS TXT) → 2. Issue an API key → 3. Put it in
   server-side env → 4. Call `${BASE}/public/v1/*` with `Authorization` +
   `Origin`. Cache responses; rotate keys when they leak.
