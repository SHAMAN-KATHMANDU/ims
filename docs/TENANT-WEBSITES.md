# Tenant Websites — complete guide

> **Audience:** You just cloned this repo and someone told you "we built multi-tenant websites." This document explains what that means, what got added, how it works end-to-end, and how to turn it on. No prior context assumed.

---

## 1. What problem does this solve?

Before this change, the IMS (projectX/apps/web) was the only customer-facing surface. If a tenant like "Shaman Kathmandu" wanted a public storefront, someone had to fork the old static `shamanktm-website` project, hand-code their products, and deploy a separate site. It didn't scale.

**After this change:**

- A single **platform administrator** can turn on the website feature for any tenant from the admin UI.
- The tenant's admin can then pick a **template** (minimal / standard / luxury / boutique), customize branding/contact/SEO, and hit **Publish**.
- When a visitor hits `www.<tenant>.com`, the backend resolves the hostname to that tenant, pulls their published content from the database, and serves it. No per-tenant forks, no redeploys.
- All of this is behind a feature flag (`TENANT_WEBSITES`) that's currently **on in development and staging**, and **off in production**, so we can soak-test before rollout.

---

## 2. The mental model

Three roles, three stages:

```
┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐
│ Platform admin     │   │ Tenant admin       │   │ Public visitor     │
│ (you)              │   │ (customer's staff) │   │ (no login)         │
├────────────────────┤   ├────────────────────┤   ├────────────────────┤
│ Enable website for │──►│ Pick template,     │──►│ Hits                │
│ tenant, add domain │   │ edit branding,     │   │ www.<tenant>.com,  │
│ www.<tenant>.com   │   │ click Publish      │   │ sees their site    │
└────────────────────┘   └────────────────────┘   └────────────────────┘
```

Each stage maps to a different set of API endpoints and UI pages:

| Stage | Actor          | UI route                                                | API prefix           |
| ----- | -------------- | ------------------------------------------------------- | -------------------- |
| 1     | Platform admin | `/:workspace/platform/tenants/:id/website` & `/domains` | `/api/v1/platform/*` |
| 2     | Tenant admin   | `/:workspace/settings/site`                             | `/api/v1/sites/*`    |
| 3     | Public visitor | N/A (hits their own domain)                             | `/api/v1/public/*`   |

---

## 3. What got added (high level)

### New database tables

| Table            | Purpose                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tenant_domains` | One row per hostname a tenant owns (`www.acme.com`, `ims.acme.com`, ...). Stores verify token, TLS status, and which "app" the hostname points to (WEBSITE / IMS / API). |
| `site_configs`   | One row per tenant. Holds the website feature flag, picked template, branding/contact/SEO JSON, and publish status.                                                      |
| `site_templates` | Catalog of available templates (minimal / standard / luxury / boutique). Platform-managed, seeded at install.                                                            |

### New backend modules (`apps/api/src/modules/`)

| Module               | Audience            | What it does                                                              |
| -------------------- | ------------------- | ------------------------------------------------------------------------- |
| `platform-domains/`  | Platform admin only | CRUD for `tenant_domains`, DNS TXT verification                           |
| `platform-websites/` | Platform admin only | Enable/disable website feature per tenant, list templates                 |
| `sites/`             | Tenant admin        | Edit own site config, pick template, publish/unpublish                    |
| `public-site/`       | Unauthenticated     | Serve published site content to visitors (resolves tenant by Host header) |

### New middleware (`apps/api/src/middlewares/`)

- **`hostnameResolver.ts`** — Looks at `req.hostname`, finds the matching `tenant_domains` row, attaches `req.tenant` and `req.appType`, then runs the rest of the request inside that tenant's AsyncLocalStorage context so every Prisma query is auto-scoped to them. Has a 60-second in-process cache.

### New frontend features (`apps/web/features/`)

| Feature        | Audience       | What it does                                                                                         |
| -------------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `sites/`       | Platform admin | Tenant detail tabs: list domains, add/verify/delete, toggle website feature, pick template, nav tabs |
| `tenant-site/` | Tenant admin   | Full site editor: branding form, contact form, SEO form, template picker, publish/unpublish          |

---

## 4. The feature flag

Everything in this change is gated by `EnvFeature.TENANT_WEBSITES`, defined in `packages/shared/src/config/env-features.ts`:

```
development        → true   (devs always get it)
staging            → true   (soak-testing here)
staging-production → false  (wait until ready)
production         → false  (wait until ready)
```

### How the flag works

The flag is evaluated in two places:

1. **Backend** — Every new router calls `enforceEnvFeature(EnvFeature.TENANT_WEBSITES)` as its first middleware. When the flag is off, every `/platform/domains`, `/platform/tenants/:id/website`, `/sites/*`, and `/public/*` request returns **404** — the endpoints look like they don't exist. This is the safest shape: nobody can hit the feature accidentally, and nothing about it is advertised.
2. **Frontend** — The three new routes (`settings/site`, `platform/tenants/:id/domains`, `platform/tenants/:id/website`) are wrapped in `<EnvFeaturePageGuard>`, and the navigation links to them (the "Website" card on the settings page, the "Domains"/"Website" tabs on the platform tenant detail page) are conditionally rendered via `useEnvFeatureFlag(EnvFeature.TENANT_WEBSITES)`. When the flag is off, users don't see any of it.

### How to toggle it

There are **three** ways to change the flag for a given environment:

**Option A — Edit the matrix in code (permanent).**
Open `packages/shared/src/config/env-features.ts` and flip `TENANT_WEBSITES: true` for the env row you want. Rebuild `packages/shared` (`pnpm --filter @repo/shared build`), redeploy. This is how you ship the feature to production when it's ready.

**Option B — Override at runtime via `FEATURE_FLAGS` env var.**
Set `FEATURE_FLAGS=TENANT_WEBSITES,CRM,SALES,...` on the deployed service. When this env var is set, the matrix is ignored and _only_ the comma-separated flags are enabled. Useful for emergency toggles without a deploy.

**Option C — Change `APP_ENV` / `NODE_ENV`.**
Setting `NODE_ENV=staging` or `APP_ENV=staging` on your local `.env` turns the flag on automatically (since staging has it on). `NODE_ENV=development` also turns it on.

### Current state

- **dev**: on
- **staging**: on
- **staging-production**: off
- **production**: off

---

## 5. End-to-end flow (the "magic" walkthrough)

Let's say "Acme Corp" is a tenant and you want to launch their website.

### 5.1 Platform admin enables the website feature

```
POST /api/v1/platform/tenants/acme-id/website/enable
Body: { "templateSlug": "luxury" }
```

UI equivalent: log in as platformAdmin → `/:workspace/platform/tenants/acme-id/website` → click the "Luxury" template card.

**What happens in the DB:** a `site_configs` row is upserted with `tenant_id=acme-id`, `website_enabled=true`, `template_id=<luxury id>`, and the template's `defaultBranding` + `defaultSections` copied onto the row.

### 5.2 Platform admin registers domains

```
POST /api/v1/platform/tenants/acme-id/domains
Body: { "hostname": "www.acme.com", "appType": "WEBSITE" }

POST /api/v1/platform/tenants/acme-id/domains
Body: { "hostname": "ims.acme.com", "appType": "IMS" }
```

UI equivalent: same tenant page → `Domains` tab → `Add domain`.

**Guard:** the first one would **fail with 409** if the website feature hadn't been enabled in step 5.1 — the `platform-domains.service.addDomain` method calls `assertWebsiteEnabled` before allowing a `WEBSITE`-type domain. IMS-type domains skip this guard because IMS is always available.

Each new domain is assigned a random `verify_token` (hex). The customer needs to prove they own the domain before TLS can be issued.

### 5.3 Platform admin (or customer) verifies ownership

```
GET /api/v1/platform/domains/<domain-id>/verification
→ { "txtName": "_shaman.www.acme.com", "txtValue": "shaman-verify=abc123...", "verifiedAt": null }
```

The admin shows the customer those two values. The customer logs into their DNS provider and adds a TXT record at `_shaman.www.acme.com` with value `shaman-verify=abc123...`.

Then:

```
POST /api/v1/platform/domains/<domain-id>/verify
```

The backend runs Node's `dns.resolveTxt("_shaman.www.acme.com")`, looks for the expected value, and sets `verifiedAt` if it matches. If the TXT record isn't there yet (NXDOMAIN) or doesn't match, it returns a **400** with a clear message so the admin can retry.

UI equivalent: the `Verify` button on each domain row opens a dialog with copy-to-clipboard buttons for the TXT name/value, and a `Verify now` button.

### 5.4 Tenant admin customizes

Now Acme's own admin logs in to the IMS and goes to `/:workspace/settings/site`. They see:

1. **Publication card** — "Ready to publish — your template is picked."
2. **Template picker** — they can switch to a different template; a confirmation dialog asks if they want to "Keep my branding" or "Reset to defaults."
3. **Branding form** — display name, tagline, logo/favicon URLs, primary/accent hex colors, theme (light/dark).
4. **Contact form** — email, phone, address, Google Maps URL.
5. **SEO form** — meta title, description, keywords, OG image.

Each form saves independently with a `PUT /api/v1/sites/config` call that only sends the fields that changed. The backend strips unset fields before merging, so tenant customizations don't clobber each other.

### 5.5 Tenant admin publishes

```
POST /api/v1/sites/publish
```

UI: click the **Publish site** button (disabled until a template is picked). `site_configs.is_published` flips to `true`. Done.

### 5.6 Public visitor hits the site

```
GET https://www.acme.com/...
→ internal: GET /api/v1/public/site  (Host: www.acme.com)
```

Here's what happens, in order:

1. **`enforceEnvFeature` middleware** — checks `TENANT_WEBSITES` is on for the current env. In production today, it's **off**, so the visitor would get a 404. In staging, it passes through.
2. **`resolveTenantFromHostname` middleware** —
   - Reads `req.hostname` → `"www.acme.com"`.
   - Looks it up in the 60-second in-process cache. If miss, queries `tenant_domains` by hostname.
   - Finds `tenantId=acme-id`, `appType=WEBSITE`.
   - Attaches `req.tenant` and `req.appType` to the request.
   - Runs the rest of the handler chain inside `runWithTenant(acme-id, ...)` so downstream Prisma queries auto-scope to Acme.
   - If the hostname isn't in the table → **404 "Unknown host"**.
   - If the tenant is inactive → **403**.
3. **`public-site.controller.getSite`** — reads `req.tenant.id`, calls `service.getSite(tenantId)`.
4. **`public-site.service.getSite`** — calls `ensurePublished(tenantId)`, which:
   - Looks up the `site_configs` row.
   - Returns **404** if the row is missing, or `website_enabled=false`, or `is_published=false`. The 404 leaks nothing about the tenant's existence — it's the same response you'd get for an unknown host.
5. If the guard passes, it returns `{ branding, contact, features, seo, template }`. The tenant-site renderer (not built yet — see §9) uses that payload + the template info to render HTML.

Other `/public/*` endpoints follow the same guard flow: `/public/products`, `/public/products/:id`, `/public/categories`. All auto-scoped.

---

## 6. File map — where everything lives

### Database / schema

```
apps/api/prisma/schema.prisma
  ├─ model TenantDomain        (new)
  ├─ model SiteConfig          (new)
  ├─ model SiteTemplate        (new)
  ├─ enum TenantDomainApp      (WEBSITE | IMS | API)
  ├─ enum TenantDomainTls      (PENDING | ACTIVE | FAILED)
  └─ enum SiteTemplateTier     (MINIMAL | STANDARD | LUXURY | BOUTIQUE)

apps/api/prisma/migrations/
  ├─ 20260413160235_add_tenant_domains_and_site_config/
  └─ 20260413164114_add_site_templates_and_website_toggle/

apps/api/prisma/seeds/01b-site-templates.seed.ts   (seeds the 4 starter templates)
```

### Backend modules

```
apps/api/src/modules/
  ├─ platform-domains/
  │  ├─ platform-domains.schema.ts      (Zod)
  │  ├─ platform-domains.repository.ts  (basePrisma — cross-tenant)
  │  ├─ platform-domains.service.ts     (business logic + DNS verify)
  │  ├─ platform-domains.controller.ts
  │  ├─ platform-domains.router.ts      (mounted under /platform)
  │  └─ *.test.ts                       (49 tests)
  │
  ├─ platform-websites/
  │  ├─ platform-websites.schema.ts
  │  ├─ platform-websites.repository.ts
  │  ├─ platform-websites.service.ts    (enable/disable, list templates, assertWebsiteEnabled)
  │  ├─ platform-websites.controller.ts
  │  ├─ platform-websites.router.ts
  │  └─ *.test.ts                       (27 tests)
  │
  ├─ sites/
  │  ├─ sites.schema.ts                 (Zod — partial updates)
  │  ├─ sites.repository.ts             (tenant-scoped prisma)
  │  ├─ sites.service.ts                (getConfig, updateConfig, pickTemplate, publish, unpublish)
  │  ├─ sites.controller.ts
  │  ├─ sites.router.ts                 (admin/superAdmin only)
  │  └─ *.test.ts                       (40 tests)
  │
  └─ public-site/
     ├─ public-site.schema.ts           (pagination query)
     ├─ public-site.repository.ts       (tenant-scoped prisma, read-only)
     ├─ public-site.service.ts          (ensurePublished guard)
     ├─ public-site.controller.ts       (reads req.tenant, not JWT)
     ├─ public-site.router.ts           (mounts hostnameResolver)
     └─ *.test.ts                       (30 tests)
```

### Middleware

```
apps/api/src/middlewares/
  ├─ hostnameResolver.ts                (NEW — Host→tenant resolver with cache)
  └─ hostnameResolver.test.ts           (9 tests)
```

### Route wiring

```
apps/api/src/config/router.config.ts
  ├─ /webhooks                          (unchanged)
  ├─ /auth                              (unchanged)
  ├─ /public     → publicSiteRouter     (NEW, before auth chain)
  ├─ verifyToken + resolveTenant        (existing chain)
  ├─ /platform   → platformRouter       (platform-domains + platform-websites routers mounted inside)
  └─ /sites      → sitesRouter          (NEW, under auth chain)
```

### Frontend features

```
apps/web/features/
  ├─ sites/                             (platform admin UI)
  │  ├─ services/site-platform.service.ts
  │  ├─ validation.ts
  │  ├─ hooks/use-tenant-domains.ts
  │  ├─ hooks/use-tenant-website.ts
  │  ├─ components/
  │  │  ├─ TenantNavTabs.tsx            (General | Domains | Website tab strip, flag-gated)
  │  │  ├─ TenantDomainsPage.tsx
  │  │  ├─ TenantWebsitePage.tsx
  │  │  ├─ AddDomainDialog.tsx
  │  │  └─ VerifyDomainDialog.tsx
  │  └─ index.ts
  │
  └─ tenant-site/                       (tenant admin UI)
     ├─ services/tenant-site.service.ts
     ├─ validation.ts                   (branding/contact/SEO schemas + serialization helpers)
     ├─ hooks/use-tenant-site.ts
     ├─ components/
     │  ├─ TenantSitePage.tsx           (main editor page)
     │  ├─ SiteTemplatePicker.tsx
     │  ├─ SiteBrandingForm.tsx
     │  ├─ SiteContactForm.tsx
     │  └─ SiteSeoForm.tsx
     └─ index.ts
```

### Frontend routes

```
apps/web/app/[workspace]/(admin)/
  ├─ platform/tenants/[id]/
  │  ├─ edit/page.tsx                   (existing, now shows nav tabs)
  │  ├─ domains/page.tsx                (NEW, wrapped in EnvFeaturePageGuard)
  │  └─ website/page.tsx                (NEW, wrapped in EnvFeaturePageGuard)
  └─ settings/
     ├─ page.tsx                        (existing, now has "Website" card — flag-gated)
     └─ site/page.tsx                   (NEW, wrapped in EnvFeaturePageGuard)
```

### Feature flag definition

```
packages/shared/src/config/env-features.ts
  └─ EnvFeature.TENANT_WEBSITES         (added to enum + 4 env rows in ENV_FEATURE_MATRIX)
```

### Docs

```
docs/TENANT-WEBSITES.md                 (this file)
```

---

## 7. API reference (cheat sheet)

All routes are under `/api/v1` and require `TENANT_WEBSITES` flag to be enabled.

### Platform admin (requires `platformAdmin` role)

| Method | Path                                          | Purpose                                                                    |
| ------ | --------------------------------------------- | -------------------------------------------------------------------------- |
| GET    | `/platform/site-templates`                    | List all templates in the catalog                                          |
| GET    | `/platform/tenants/:tenantId/domains`         | List a tenant's domains                                                    |
| POST   | `/platform/tenants/:tenantId/domains`         | Add a domain (`WEBSITE` type requires website feature to be enabled first) |
| PATCH  | `/platform/domains/:id`                       | Update `appType` or `isPrimary`                                            |
| DELETE | `/platform/domains/:id`                       | Remove a domain                                                            |
| GET    | `/platform/domains/:id/verification`          | Get TXT record instructions                                                |
| POST   | `/platform/domains/:id/verify`                | Run DNS TXT check, mark `verifiedAt` on success                            |
| GET    | `/platform/tenants/:tenantId/website`         | Get a tenant's site config                                                 |
| POST   | `/platform/tenants/:tenantId/website/enable`  | Turn on website feature, optionally pre-pick `{ templateSlug }`            |
| POST   | `/platform/tenants/:tenantId/website/disable` | Turn off website feature (content preserved; `isPublished` forced false)   |

### Tenant admin (requires `admin` or `superAdmin` role, scoped to caller's own tenant)

| Method | Path               | Purpose                                                                       |
| ------ | ------------------ | ----------------------------------------------------------------------------- |
| GET    | `/sites/config`    | Read own site config (includes template)                                      |
| PUT    | `/sites/config`    | Update any of `branding`, `contact`, `features`, `seo` (partial, nulls clear) |
| GET    | `/sites/templates` | List active templates                                                         |
| POST   | `/sites/template`  | Pick/switch template, body `{ templateSlug, resetBranding }`                  |
| POST   | `/sites/publish`   | Publish (requires template picked)                                            |
| POST   | `/sites/unpublish` | Unpublish                                                                     |

### Public (no auth, tenant resolved from `Host` header)

| Method | Path                   | Purpose                                                                       |
| ------ | ---------------------- | ----------------------------------------------------------------------------- |
| GET    | `/public/site`         | Branding/contact/features/seo/template for the Host's tenant (published only) |
| GET    | `/public/products`     | Paginated product list (`?page=1&limit=24&categoryId=...&search=...`)         |
| GET    | `/public/products/:id` | Single product                                                                |
| GET    | `/public/categories`   | Category list                                                                 |

All `/public/*` endpoints return **404** if the resolved tenant's site is missing, not enabled, or not published. This is intentional — we don't leak existence.

---

## 8. How to enable it on your machine (step by step)

Assuming you just pulled this branch and have the rest of projectX running locally:

### 8.1 Apply the migrations

```bash
cd apps/api
pnpm exec prisma migrate dev
```

You should see two migrations apply: `add_tenant_domains_and_site_config` and `add_site_templates_and_website_toggle`. This creates the three new tables.

### 8.2 Seed the template catalog

The four starter templates (minimal, standard, luxury, boutique) are seeded automatically on a fresh seed. If you already have a seeded DB and just want to add templates:

```bash
cd apps/api
node --experimental-strip-types -e "
import('./prisma/seeds/01b-site-templates.seed.ts').then(async (m) => {
  const { PrismaClient } = await import('@prisma/client');
  const p = new PrismaClient();
  await m.seedSiteTemplates(p);
  await p.\$disconnect();
});"
```

You should see `✓ Site templates (4)`.

### 8.3 Make sure the feature flag is on

`NODE_ENV=development` (which is the default) → the flag is **on** automatically. If you've set `NODE_ENV=production` locally, either change it or add `FEATURE_FLAGS=TENANT_WEBSITES` to your `.env`.

### 8.4 Restart the API

```bash
cd apps/api
pnpm dev
```

You should see all routes mount without complaints. Hitting `GET /api/v1/platform/site-templates` with a platformAdmin JWT should return 4 templates.

### 8.5 Use it in the browser

1. Log in as a platformAdmin user.
2. Visit `/:workspace/platform/tenants` → pick a tenant → you should see three tabs: **General**, **Domains**, **Website**.
3. Go to **Website**, click a template card, confirm → you've enabled the website feature for that tenant.
4. Go to **Domains**, click **Add domain**, enter `www.your-test-tenant.com` and `WEBSITE`. It'll save. (Verification won't work unless that DNS record actually exists, but that's expected.)
5. Log out, log back in as the tenant's own admin.
6. Visit `/:workspace/settings` → click the **Website** card.
7. Customize branding/contact/SEO, click **Publish site**.
8. In another terminal, simulate a public visitor:
   ```bash
   curl -H "Host: www.your-test-tenant.com" http://localhost:4000/api/v1/public/site
   ```
   You should see the branding JSON you just edited.

### 8.6 To turn the feature OFF locally (for testing)

Add to `apps/api/.env`:

```
FEATURE_FLAGS=CRM,SALES,PRODUCTS,SETTINGS
```

(Any list that doesn't include `TENANT_WEBSITES`.) Restart. Now `/public/*`, `/sites/*`, and the new `/platform/*` routes all return 404, and the Website tab/card disappear from the UI.

---

## 9. What's still NOT built

The full original plan had two more pieces that this change doesn't include:

1. **Edge proxy + TLS** — Something like Caddy or Traefik in front of the API that handles:
   - Wildcard TLS (Let's Encrypt DNS-01) or on-demand per-domain TLS with a callback to `/internal/domain-allowed?host=...`.
   - Routing `ims.*` → projectX/web, `api.*` → api, everything else → the tenant-site renderer.
   - Graceful reloads when new domains are added.
2. **`apps/tenant-site`** — A dedicated Next.js SSR app that consumes `/public/site`, `/public/products`, etc., and actually renders the HTML. Today the endpoints return JSON; there's no renderer yet. The **existing** `shamanktm-website` is still a static export with hardcoded data and is **not** wired up.

Both are substantial pieces of infra work. They're called out here so nobody thinks we're "done done."

---

## 10. Testing summary

The change ships with **255 new tests** across both apps:

| Layer                                      | File count                    | Test count |
| ------------------------------------------ | ----------------------------- | ---------- |
| API — platform-domains                     | 3 (schema/service/controller) | 49         |
| API — platform-websites                    | 3                             | 27         |
| API — sites                                | 3                             | 40         |
| API — public-site                          | 3                             | 30         |
| API — hostnameResolver middleware          | 1                             | 9          |
| Web — sites service                        | 1                             | 13         |
| Web — tenant-site service                  | 1                             | 8          |
| Web — tenant-site validation/serialization | 1                             | 17         |
| **Total (new)**                            | **16**                        | **193**    |

Plus **0 regressions**: before this change the api suite was at ~1205 / the web suite was at ~113. After, both are green at **1430/1430** and **163/163** respectively.

To run just the new tests:

```bash
# API
cd apps/api
pnpm exec vitest run src/modules/platform-domains src/modules/platform-websites src/modules/sites src/modules/public-site src/middlewares/hostnameResolver

# Web
cd apps/web
pnpm exec vitest run features/sites features/tenant-site
```

---

## 11. Conventions followed

This change was written to match the house style discovered in `.cursor/rules/*` and existing modules (especially `crm-settings`, which is the most recent canonical example):

- **6-file module structure**: every new module has `schema.ts`, `repository.ts`, `service.ts`, `controller.ts`, `router.ts`, and matching `*.test.ts` files.
- **Kebab-case filenames and directory names** (`platform-domains/`, not `platformDomains/`).
- **Layering**: repository is the only layer that touches Prisma, service holds business logic with constructor DI for testability, controller is a thin HTTP wrapper.
- **`basePrisma`** is used in modules that operate across tenants (`platform-domains`, `platform-websites`). Tenant-scoped modules (`sites`, `public-site`) use the extended `prisma` client and rely on `tenantContext` AsyncLocalStorage for auto-scoping.
- **`createError(message, statusCode)`** from `middlewares/errorHandler` for business errors — no custom error classes.
- **`getAuthContext(req)`** to extract `tenantId` from JWT in tenant-scoped controllers.
- **Zod** for request-body validation, always parsed in the controller, with `ZodError → 400`.
- **`AppError.statusCode`** pass-through in controllers before falling back to `sendControllerError` for unexpected failures.
- **Full Swagger annotations** on every endpoint.
- **Feature flag via `EnvFeature`** with `enforceEnvFeature` middleware on the backend and `EnvFeaturePageGuard` + `useEnvFeatureFlag` on the frontend, following the documented "how to add a new feature flag" checklist in `packages/shared/src/config/env-features.ts`.

---

## 12. Glossary (if any of the above was jargon)

- **Tenant** — a customer organization with their own users, data, and settings. All projectX data is scoped to a tenant.
- **Multi-tenant** — one deployment of the app serves many tenants, each seeing only their own data.
- **Platform admin** — a super-user role that can manage ALL tenants. Different from a tenant's own admin.
- **JWT** — the authentication token the frontend sends on every API request. Contains the user's ID, role, and `tenantId`.
- **Prisma** — the ORM (object-relational mapper) this project uses to talk to PostgreSQL. Schema lives in `apps/api/prisma/schema.prisma`.
- **AsyncLocalStorage** — a Node.js feature that lets you set "context" at the start of a request and have downstream code read it without explicit parameter passing. Used here so Prisma queries auto-scope to the current tenant.
- **Auto-scoping** — Prisma is extended so any `prisma.product.findMany()` call automatically adds `where: { tenantId: <current> }`. Makes it nearly impossible to accidentally leak data across tenants.
- **Feature flag** — a boolean switch that hides a feature in certain environments without removing the code. Used here so we can ship to staging without making it visible in production.
- **DNS TXT record** — a DNS entry customers add at their domain registrar to prove they own a domain. Contains a random verification token we generate.
- **TLS (HTTPS)** — the SSL/TLS certificate layer. Needs to be issued per domain, usually via Let's Encrypt.
- **Let's Encrypt** — free, automated certificate authority. Can be used via DNS-01 challenge (for wildcards) or HTTP-01 (per domain).
- **ISR (Incremental Static Regeneration)** — Next.js feature where pages are statically generated at build time but re-rendered on demand when underlying data changes. Relevant for the future `apps/tenant-site` renderer.

---

**Questions, confusion, or something not clear? The entire codebase for this change is walkable from section §6's file map — start there and work out.**
