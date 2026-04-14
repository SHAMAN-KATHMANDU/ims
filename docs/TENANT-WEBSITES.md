# Tenant Websites — complete guide

> **Audience:** You just cloned this repo and someone told you "we built multi-tenant websites." This document explains what that means, what got added, how it works end-to-end, and how to turn it on. No prior context assumed.

**Last updated:** 2026-04-13 (post dev cutover)
**Status:** Shipped on dev, soaking before prod rollout — see **§9 Rollout status**

---

## Table of contents

1. [What problem does this solve?](#1-what-problem-does-this-solve)
2. [The mental model](#2-the-mental-model)
3. [What got added (high level)](#3-what-got-added-high-level)
4. [The feature flag](#4-the-feature-flag)
5. [End-to-end flow (the "magic" walkthrough)](#5-end-to-end-flow-the-magic-walkthrough)
6. [File map — where everything lives](#6-file-map--where-everything-lives)
7. [API reference (cheat sheet)](#7-api-reference-cheat-sheet)
8. [How to enable it on your machine (step by step)](#8-how-to-enable-it-on-your-machine-step-by-step)
9. [Rollout status by phase](#9-rollout-status-by-phase)
10. [Testing summary](#10-testing-summary) — unit counts + **§10.1 E2E validation matrix**
11. [Conventions followed](#11-conventions-followed)
12. [Glossary](#12-glossary-if-any-of-the-above-was-jargon)
13. [Infrastructure — how traffic actually reaches a tenant](#13-infrastructure--how-traffic-actually-reaches-a-tenant)
14. [Runbooks](#14-runbooks) — cutover, rollback, smoke tests, **§14.7 template seed SQL**, **§14.8 E2E recipe**, **§14.9 runtime patch trick**
15. [Glossary additions (from §13–§14)](#15-glossary-additions-from-1314)
16. **[Dev cutover retrospective (2026-04-13)](#16-dev-cutover-retrospective-2026-04-13)** — the three hotfixes we hit in real life
17. **[Lessons learned (for the next rollout like this)](#17-lessons-learned-for-the-next-rollout-like-this)**
18. **[Blog system](#18-blog-system)** — Phase A: tenant-scoped blog with markdown editor + public rendering

> **If you're trying to do the prod cutover:** start at **§14.5** then walk the checklist in **§16** for every gotcha we hit on dev.
> **If you're onboarding and trying to understand what this is:** read **§1–§5** in order.
> **If you're debugging a broken site:** start at **§14.6 Observability cheat sheet** then check **§16.2** (the Host header bug) if SSR is 404ing.

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
  ├─ public-site/
  │  ├─ public-site.schema.ts           (pagination query)
  │  ├─ public-site.repository.ts       (tenant-scoped prisma, read-only)
  │  ├─ public-site.service.ts          (ensurePublished guard)
  │  ├─ public-site.controller.ts       (reads req.tenant, not JWT)
  │  ├─ public-site.router.ts           (mounts hostnameResolver)
  │  └─ *.test.ts                       (30 tests)
  │
  └─ internal/                          (server-to-server only — added PR #349)
     ├─ internal.schema.ts              (hostname Zod field reused for both endpoints)
     ├─ internal.repository.ts          (single query: domain + tenant + site_config)
     ├─ internal.service.ts              (DomainAllowedResult + ResolveHostResult discriminated unions)
     ├─ internal.controller.ts          (thin shell; status-code based API for Caddy)
     ├─ internal.router.ts              (mounted at /internal, before JWT chain)
     └─ *.test.ts                       (29 tests)
```

### Middleware — API

```
apps/api/src/middlewares/
  ├─ hostnameResolver.ts              (Host header → tenant via TenantDomain lookup + 60s cache)
  ├─ hostnameResolver.test.ts         (13 tests including the 4 X-Forwarded-Host cases from PR #351)
  ├─ requireInternalToken.ts          (shared-secret guard, accepts header OR ?_t= query param)
  └─ requireInternalToken.test.ts     (9 tests)
```

### Tenant site renderer

```
apps/tenant-site/
  ├─ Dockerfile                       (multi-stage, Node 20-alpine, standalone Next output)
  ├─ next.config.js                   (output: standalone, security headers)
  ├─ next-env.d.ts
  ├─ env.d.ts                         (runtime env vars: API_INTERNAL_URL, INTERNAL_API_TOKEN, ...)
  ├─ middleware.ts                    (reads Host → /internal/resolve-host, 60s in-memory cache)
  ├─ lib/
  │  ├─ api.ts                        (typed fetch of /public/* with next.tags + X-Forwarded-Host)
  │  ├─ tenant.ts                     (getTenantContext() — reads injected x-tenant-id from headers())
  │  └─ theme.ts                      (branding JSON → CSS custom properties)
  ├─ components/templates/
  │  ├─ types.ts                      (TemplateProps discriminated shape)
  │  ├─ shared.tsx                    (SiteHeader, Hero, ProductGrid, ProductDetail, Footer)
  │  ├─ MinimalLayout.tsx             (1 of 4 templates)
  │  ├─ StandardLayout.tsx            (the default pick; built first)
  │  ├─ LuxuryLayout.tsx              (dark editorial)
  │  ├─ BoutiqueLayout.tsx            (warm, story-first)
  │  └─ pickTemplate.ts               (slug → component, falls back to StandardLayout)
  ├─ app/
  │  ├─ layout.tsx                    (RootLayout — reads SiteConfig via headers())
  │  ├─ globals.css
  │  ├─ page.tsx                      (home — picks template, renders)
  │  ├─ products/
  │  │  ├─ page.tsx                   (product list)
  │  │  └─ [id]/page.tsx              (PDP)
  │  ├─ contact/page.tsx
  │  ├─ not-found.tsx                 (global 404)
  │  ├─ healthz/route.ts              (container healthcheck; bypasses middleware)
  │  ├─ api/revalidate/route.ts       (cache-tag revalidation webhook — x-revalidate-secret auth)
  │  ├─ robots.ts                     (static; not in middleware matcher)
  │  └─ sitemap.ts                    (dynamic per-host)
  └─ public/
     └─ .gitkeep                      (added in PR #350 — git doesn't track empty dirs, COPY public would fail in Docker build)
```

### Route wiring

```
apps/api/src/config/router.config.ts
  ├─ /webhooks                          (unchanged)
  ├─ /auth                              (unchanged)
  ├─ /public     → publicSiteRouter     (NEW, before auth chain)
  ├─ /internal   → internalRouter       (NEW, before auth chain — shared-secret only)
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

### Public (no auth, tenant resolved from `Host` or `X-Forwarded-Host` header)

| Method | Path                   | Purpose                                                                       |
| ------ | ---------------------- | ----------------------------------------------------------------------------- |
| GET    | `/public/site`         | Branding/contact/features/seo/template for the Host's tenant (published only) |
| GET    | `/public/products`     | Paginated product list (`?page=1&limit=24&categoryId=...&search=...`)         |
| GET    | `/public/products/:id` | Single product                                                                |
| GET    | `/public/categories`   | Category list                                                                 |

All `/public/*` endpoints return **404** if the resolved tenant's site is missing, not enabled, or not published. This is intentional — we don't leak existence.

**Hostname resolution order:** `X-Forwarded-Host` is checked first, then `req.hostname`. The reason is that Node's `undici` fetch strips the `Host` request header (it's a "forbidden header name" per the WHATWG Fetch spec), so server-to-server callers like the tenant-site renderer need `X-Forwarded-Host` to propagate the customer-facing hostname. See **§16.2** for the full backstory.

### Internal (server-to-server, shared-secret auth)

| Method | Path                       | Purpose                                                                                                                                                                                                                     |
| ------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/internal/domain-allowed` | **Caddy on_demand_tls `ask` hook.** Returns 200 if the hostname is a verified, enabled, WEBSITE-type domain for an active tenant; 403 otherwise. Caddy uses the status to decide whether to issue an ACME cert.             |
| GET    | `/internal/resolve-host`   | **tenant-site renderer middleware hook.** Resolves a `host` query param to `{ tenantId, tenantSlug, isPublished, ... }` or 404. Used by `apps/tenant-site/middleware.ts` to 404 unknown hosts before any page handler runs. |

**Auth:** both endpoints require the `X-Internal-Token` header matching `INTERNAL_API_TOKEN` on the API. As a fallback for callers that can't inject custom headers (Caddy's `on_demand_tls { ask }` directive, specifically), the token is also accepted via `?_t=<token>` query param. Constant-time comparison, fail-closed if the env var is unset.

**Gating:** like every other new route, these are wrapped in `enforceEnvFeature(EnvFeature.TENANT_WEBSITES)` so they 404 when the flag is off for the deployment.

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

## 9. Rollout status by phase

| #   | Piece                                                                  | Status | Shipped in                              |
| --- | ---------------------------------------------------------------------- | ------ | --------------------------------------- |
| 1   | Data model + migrations                                                | ✅     | PR #348                                 |
| 2   | Platform admin domain + website management (API)                       | ✅     | PR #348                                 |
| 3   | Tenant-scoped `/sites/*` API                                           | ✅     | PR #348                                 |
| 4   | Public `/public/*` API + hostname resolver                             | ✅     | PR #348                                 |
| 5   | Platform admin UI (domains + website + template picker)                | ✅     | PR #348                                 |
| 6   | Tenant site editor UI (branding + contact + SEO)                       | ✅     | PR #348                                 |
| 7   | `/internal/*` endpoints (Caddy ask hook, tenant-site host resolver)    | ✅     | PR #349                                 |
| 8   | Caddy edge proxy (containerized, on_demand_tls) — **dev only**         | ✅     | PR #349                                 |
| 9   | `apps/tenant-site` Next.js SSR renderer (4 templates)                  | ✅     | PR #349                                 |
| 10  | Cache-tag revalidation (API → tenant-site webhook)                     | ✅     | PR #349                                 |
| 11  | CI build + push for `rpandox/dev-tenant-site-ims`                      | ✅     | PR #349                                 |
| 12  | Tenant-site Docker build hotfixes (`public/`, Next 16 config)          | ✅     | PR #350                                 |
| 13  | `hostnameResolver` reads `X-Forwarded-Host` (Node fetch gotcha)        | ✅     | PR #351                                 |
| 14  | **Dev Caddy cutover live** — `stage-ims.*` + `stage-api.*` via Caddy   | ✅     | Manual runbook on `ims_dev`, 2026-04-13 |
| 15  | **Full dev E2E validation** — renderer serves a test tenant end-to-end | ✅     | Manual E2E, 2026-04-13                  |
| 16  | Prod Caddy cutover                                                     | ⏳     | Separate PR after 72h dev soak          |
| 17  | HSTS preload submission                                                | ⏳     | After prod cutover                      |

**Dev soak started:** 2026-04-13. **Earliest prod cutover:** 2026-04-16. We don't touch prod until dev has been serving tenant traffic without incident for 72+ hours. See **§14 Runbooks** for the prod cutover checklist, **§16 Dev cutover retrospective** for what actually happened (and what broke) during the dev run, and **§17 Lessons learned** for the takeaways.

---

## 10. Testing summary

Cumulative unit test count after all four PRs (#348, #349, #350, #351) are merged:

| Layer                                      | File count                    | Test count |
| ------------------------------------------ | ----------------------------- | ---------- |
| API — platform-domains                     | 3 (schema/service/controller) | 49         |
| API — platform-websites                    | 3                             | 27         |
| API — sites                                | 3                             | 40         |
| API — public-site                          | 3                             | 30         |
| API — internal (Caddy ask hook, renderer)  | 3                             | 29         |
| API — hostnameResolver middleware          | 1                             | 13         |
| API — requireInternalToken middleware      | 1                             | 9          |
| Web — sites service                        | 1                             | 13         |
| Web — tenant-site service                  | 1                             | 8          |
| Web — tenant-site validation/serialization | 1                             | 17         |
| **Total (new)**                            | **20**                        | **235**    |

Plus **0 regressions**: API suite is green at **1468/1468** (up from ~1205 baseline) and web suite is green at **163/163** (up from ~113). Tenant-site app ships with `tsc --noEmit` + Next production build verification but no unit tests yet — its logic lives in middleware and server components, which are better exercised by the end-to-end matrix in §14.8.

### 10.1 End-to-end validation matrix (dev, 2026-04-13)

After PRs #348–#351 merged and `setup-caddy.sh` cut dev over, all eight E2E checks passed on the first run after the runtime patch:

| #   | Path                                    | Host                | Expected                 | Got     |
| --- | --------------------------------------- | ------------------- | ------------------------ | ------- |
| 1   | `GET /`                                 | `test.shaman.local` | 200, branded home render | **200** |
| 2   | `GET /products`                         | `test.shaman.local` | 200, product grid        | **200** |
| 3   | `GET /contact`                          | `test.shaman.local` | 200, contact block       | **200** |
| 4   | `GET /products/:id`                     | `test.shaman.local` | 200, PDP                 | **200** |
| 5   | `GET /`                                 | `phantom.example`   | 404, leak-free           | **404** |
| 6   | `GET /healthz`                          | _(bypass)_          | 200                      | **200** |
| 7   | `POST /api/revalidate` (no secret)      | —                   | 401                      | **401** |
| 8   | `POST /api/revalidate` (correct secret) | —                   | 200                      | **200** |

Response body spot-check on `/` contained all three expected markers: `Shaman Demo Store`, `Crafted with intention`, and `data-template="standard"` — confirming the full chain (Host → middleware → `/internal/resolve-host` → page.tsx → `/public/site` → API hostnameResolver via `X-Forwarded-Host` → `runWithTenant` → Prisma scoping → StandardLayout render) works end-to-end. See **§14.8** for the copy-paste recipe to reproduce.

To run just the new unit tests:

```bash
# API
cd apps/api
pnpm exec vitest run \
  src/modules/platform-domains \
  src/modules/platform-websites \
  src/modules/sites \
  src/modules/public-site \
  src/modules/internal \
  src/middlewares/hostnameResolver \
  src/middlewares/requireInternalToken

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

---

## 13. Infrastructure — how traffic actually reaches a tenant

This section covers the second PR (Phase 2 "Edge Proxy + TLS" + Phase 3 "Tenant Site Renderer"). It layers on top of §2–§7 and describes what happens on the wire when a real visitor types `www.acme.com` into their browser.

### 13.1 Component overview

```
                      DNS: *.acme.com → EC2 IP
                                │
                                ▼
                     ┌────────────────────┐
                     │   Host (EC2)       │
                     │                    │
                     │  dev_caddy :443    │   ← holds :80 and :443 (host nginx retired on dev)
                     │  ─────────────     │
                     │   on_demand TLS    │
                     │   ask hook         │
                     │                    │
                     └────┬──────┬────────┘
                          │      │
                          │      └────────► http://dev_api:4000/api/v1/internal/domain-allowed
                          │                 (ask hook)
                          ▼
             Platform hostname?
             ┌──────────────────┐
             │ stage-ims.*      │──► dev_web:3000
             │ stage-api.*      │──► dev_api:4000
             └──────────────────┘
                          │
                          │ (tenant custom domain)
                          ▼
                   ┌──────────────────┐
                   │ dev_tenant_site  │──► (internal) /api/v1/public/*
                   │   :3100          │      + Host header passthrough
                   │   Next.js SSR    │
                   └──────────────────┘
```

Everything inside the dotted box is docker compose services on the `ims-dev` network. The only things exposed to the host network are `:80` and `:443` (Caddy), `:3000` (web, for health checks only), `:4000` (api), and `:3100` (tenant-site, for direct-to-container smoke tests).

### 13.2 The Caddy ask hook — why it exists

Let's Encrypt rate-limits certificate issuance (50 per registered domain per week). Without a gate, an attacker could point a thousand random subdomains at our IP and burn through our weekly quota in one afternoon. The `ask` hook is the gate: **every TLS handshake for an unknown hostname triggers a GET to our API**, and Caddy only proceeds with ACME if we return 200.

The strict policy (decision §6.5 of the original plan):

- Hostname must exist in `tenant_domains`
- `appType` must be `WEBSITE`
- Tenant must be active
- **Domain must be verified** (`verifiedAt !== null`)
- Tenant's `SiteConfig.websiteEnabled` must be `true`

Any failure → 403 → Caddy refuses → visitor sees a browser TLS error → customer realizes their DNS isn't wired up. That's correct — we don't want to issue a cert for a domain the customer hasn't actually validated.

### 13.3 The `/internal/*` endpoints

Two server-to-server endpoints on the API, both gated by `EnvFeature.TENANT_WEBSITES` and the `requireInternalToken` middleware. **No JWT, no tenant context.**

**`GET /api/v1/internal/domain-allowed?domain=<host>&_t=<token>`**
Called by Caddy's `ask` hook before cert issuance. Returns 200 + `{ allowed: true, tenantId }` or 403 + `{ allowed: false, reason }` where reason ∈ {`unknown_host`, `tenant_inactive`, `ims_not_allowed_via_caddy`, `not_verified`, `website_disabled`}.

**`GET /api/v1/internal/resolve-host?host=<host>`**
Called by `apps/tenant-site/middleware.ts` on every incoming request. Maps a `Host` header to `{ tenantId, tenantSlug, isPublished, … }` or 404. Used by the Next.js middleware to 404 unknown/unpublished hosts _before_ dispatching any page handler.

### 13.4 Shared-secret authentication

Both `/internal/*` endpoints require `INTERNAL_API_TOKEN`, a random ≥32-char string set in the dev `.env`. The middleware accepts the token via either:

1. **Header** `X-Internal-Token: <secret>` — preferred, used by tenant-site's middleware fetch.
2. **Query param** `?_t=<secret>` — fallback for Caddy's `ask` hook, because the Caddyfile `ask` directive can't inject custom headers. Both paths use constant-time comparison to avoid leaking the token length via timing.

The token travels only inside the `ims-dev` docker network. Fail-closed: if the env var is empty, the middleware returns **503** for every request (not 200, not 401).

### 13.5 `apps/tenant-site` — Next.js SSR renderer

A single Next.js 15 app serves **all** tenant websites. Tenant is resolved per-request from the `Host` header in `middleware.ts`, which:

1. Reads `req.headers.get("host")`.
2. Checks its 60-second in-memory cache.
3. On miss, calls `/api/v1/internal/resolve-host` with the token header.
4. On success, injects `x-tenant-id`, `x-tenant-slug`, `x-host` onto the downstream request headers.
5. On failure, returns **404** before any page handler runs.

Server components read those injected headers via `getTenantContext()` and pass the resolved tenantId + host down to the typed fetch layer in `lib/api.ts`, which forwards the original `Host` to `/api/v1/public/*`. The API's existing `resolveTenantFromHostname` middleware then auto-scopes every Prisma query via `runWithTenant`.

**Caching:** every `/public/*` fetch is tagged with `tenant:${tenantId}:<something>` using Next.js 15 `fetch.next.tags`. When a tenant publishes or edits their site, the API fires a `POST /api/revalidate` webhook (guarded by `REVALIDATE_SECRET`) to the renderer, which calls `revalidateTag()` for each tag. Visitors see new content within a second or two, with no full rebuild.

### 13.6 The four templates

`apps/tenant-site/components/templates/` has one layout per template slug plus a `shared.tsx` that holds the common sub-components (`SiteHeader`, `Hero`, `ProductCard`, `ProductGrid`, `ProductDetail`, `ContactBlock`, `SiteFooter`). Each layout takes a `TemplateProps` shape, imports the shared components, arranges them differently, and picks its own padding / typography / section order.

| Slug       | Component        | Feel                                                                   |
| ---------- | ---------------- | ---------------------------------------------------------------------- |
| `minimal`  | `MinimalLayout`  | Edge-to-edge hero, 3-column grid, tight type, lots of whitespace       |
| `standard` | `StandardLayout` | Balanced default, 4-column grid, category chips on the home page       |
| `luxury`   | `LuxuryLayout`   | Dark backdrop, 3-column grid, "THE COLLECTION" treatment, tracked caps |
| `boutique` | `BoutiqueLayout` | Warm palette, 3-column grid, story block above products                |

`pickTemplate(slug)` returns the right component; unknown slugs fall back to `StandardLayout`. Branding (name/tagline/logo/colors) is applied via CSS custom properties set on the `<body>` tag in `app/layout.tsx` — `lib/theme.ts` converts a `SiteConfig.branding` payload into `{ "--primary": "#111", "--accent": "#f5f5f5", ... }`. Templates reference those via CSS, so the same component tree themes itself per tenant.

### 13.7 docker-compose profile

The new services are gated by the `websites` compose profile so existing stacks aren't affected:

```bash
# default stack (postgres, redis, dev_api, dev_web) — unchanged
docker compose up -d

# with tenant websites (adds dev_tenant_site + dev_caddy)
docker compose --profile websites up -d
```

This is intentional: if the `websites` profile isn't active, the stack looks identical to before Phase 2. Rollback = stop the profile services.

### 13.8 Environment variables

Added to `deploy/dev/.env.example`:

| Var                        | Required                              | Purpose                                                   |
| -------------------------- | ------------------------------------- | --------------------------------------------------------- |
| `INTERNAL_API_TOKEN`       | yes (when flag on)                    | Shared secret for `/internal/*` endpoints                 |
| `REVALIDATE_SECRET`        | yes (when flag on)                    | Shared secret for tenant-site's `/api/revalidate` webhook |
| `TENANT_SITE_INTERNAL_URL` | default `http://dev_tenant_site:3100` | Where the API posts revalidation requests                 |

Generate both secrets with:

```bash
openssl rand -hex 32
```

---

## 14. Runbooks

### 14.1 First-time dev cutover (nginx → Caddy)

**Pre-requisites:**

- [ ] The API image on dev contains `/api/v1/internal/*` (check with `curl -s https://stage-api.shamankathmandu.com/api/v1/internal/domain-allowed?_t=x | jq`)
- [ ] `deploy/dev/.env` has `INTERNAL_API_TOKEN`, `REVALIDATE_SECRET`, `API_PUBLIC_URL` set
- [ ] You have a second SSH session open for emergency rollback

**Cutover:**

```bash
# On the EC2 host, deploy/dev/ files are flattened into ~/deploy/
ssh ims_dev
cd ~/deploy
./setup-caddy.sh
```

**Success signals:**

- `docker ps` shows `dev_caddy` + `dev_tenant_site` running.
- `curl -v https://stage-ims.shamankathmandu.com/` returns the IMS login page with a Let's Encrypt cert.
- `curl -v https://stage-api.shamankathmandu.com/api/v1/` returns `{"message":"API is running", ...}`.
- `docker logs dev_caddy` shows `issued certificate` lines.

**If things break:**

```bash
./teardown-caddy.sh   # stops the profile, restarts host nginx
```

See `deploy/dev/README-caddy-migration.md` for the detailed version.

### 14.2 Smoke-testing on-demand TLS with a scratch domain

1. Pick a domain you control (e.g. `test.example.dev`). Add an A record pointing to the EC2 IP.
2. In the IMS, log in as platformAdmin. Navigate to a test tenant → Website tab → pick a template → click Enable.
3. Go to Domains tab → Add domain → `test.example.dev` / `WEBSITE`.
4. Click **Verify** on the new row → copy the TXT name + value → add it at your DNS registrar.
5. Wait ~1 minute for DNS propagation, click **Verify now** in the dialog.
6. In a fresh terminal:
   ```bash
   curl -v https://test.example.dev/
   ```
7. Watch `docker logs -f dev_caddy` in parallel. Expected sequence:
   - `handshake received`
   - `on_demand tls: certificate needed` → ask hook fires
   - `"allowed":true`
   - ACME solving (usually 3–10 seconds)
   - HTTP 200 from the tenant-site renderer

**If you see `{"allowed":false,"reason":"not_verified"}`:** the TXT record isn't set or hasn't propagated. Run `dig _shaman.test.example.dev TXT` to confirm. The system is correctly refusing to burn a cert on an unverified domain.

### 14.3 Publishing triggers cache invalidation — verifying the path

1. Edit branding in `/settings/site` on the tenant side, save.
2. Hit the tenant's public URL in a browser — new branding should appear within seconds.
3. `docker logs dev_api | grep 'tenant-site revalidation'` — should be empty (no warnings = success).
4. `docker logs dev_tenant_site | grep revalidate` — should show `{ revalidated: 3 }` entries.

If revalidation is silently failing, the next ISR window (5 minutes default) will pick up the change anyway — it's a freshness optimization, not a correctness gate.

### 14.4 Rollback (nuclear)

If everything is on fire on dev:

```bash
# Option A: feature flag kill switch — fastest
# SSH to dev, edit deploy/dev/.env:
#   FEATURE_FLAGS=CRM,SALES,PRODUCTS,SETTINGS   (omit TENANT_WEBSITES)
docker compose restart dev_api
# Every /internal/*, /public/*, /sites/*, and /platform/*/domains|website* route
# now 404s. Caddy ask hook starts getting 404s, refuses new certs. Existing
# certs remain valid for their lifetime. IMS/API/web are unaffected.

# Option B: stop the websites profile entirely
docker compose --profile websites stop dev_caddy dev_tenant_site

# Option C: full rollback to host nginx
./teardown-caddy.sh
```

Every option leaves `dev_api`, `dev_web`, `dev_db`, `dev_redis` untouched.

### 14.5 Going to prod (checklist — DO NOT run without approval)

1. Dev has soaked for ≥72 hours without an `internal_api_token` auth failure, a Caddy `ask hook errored` log line, or a 5xx on `/public/*` at a rate above baseline.
2. Copy the dev Caddyfile to `deploy/prod/Caddyfile`, swap the explicit `server_name` blocks to `app.shamanyantra.com` + `api.shamanyantra.com`.
3. Add the `websites` compose profile services to `deploy/prod/docker-compose.yml` with `prod_` prefixes.
4. Add `INTERNAL_API_TOKEN` + `REVALIDATE_SECRET` to `deploy/prod/.env` (generate fresh secrets; do **not** reuse dev's).
5. Build and publish `rpandox/prod-tenant-site-ims:prod` via the CI pipeline.
6. Flip `TENANT_WEBSITES: true` in the `production` row of `packages/shared/src/config/env-features.ts`, rebuild `@repo/shared`, publish `rpandox/prod-api-ims:prod`.
7. Wait for Watchtower to pull the new API image. Confirm `/internal/domain-allowed` works with a curl from the EC2 host.
8. Run `deploy/prod/setup-caddy.sh` (the prod version mirrors dev's). **Expect ~30 seconds of blip on `app.shamanyantra.com` / `api.shamanyantra.com`** while nginx stops and Caddy grabs `:443`.
9. Smoke test all three hostname patterns: prod IMS, prod API, first production tenant's custom domain.
10. Monitor `docker logs -f prod_caddy prod_api prod_tenant_site` for 30 minutes.

**Prod is its own PR, its own review, its own soak window. Don't bundle it with anything else.**

### 14.6 Observability cheat sheet

| What                    | Where                                                                                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caddy access logs       | `docker logs dev_caddy` + `/var/log/caddy/access.log` inside the container (the global `log` block in the Caddyfile redirects the default logger there — `docker logs` only shows the first ~12 lines of startup) |
| Caddy ACME activity     | `docker exec dev_caddy sh -c 'tail -f /var/log/caddy/access.log' \| grep -i acme`                                                                                                                                 |
| Internal endpoint calls | `docker logs dev_api \| grep internal/`                                                                                                                                                                           |
| Revalidation hits       | `docker logs dev_tenant_site \| grep revalidate`                                                                                                                                                                  |
| Tenant-site SSR errors  | `docker logs dev_tenant_site \| grep '\[tenant-site\]'`                                                                                                                                                           |
| Prometheus counters     | `/metrics` on `dev_api:4000` (existing endpoint)                                                                                                                                                                  |

### 14.7 Seeding templates directly (when the Prisma seed hasn't run)

The `site_templates` table is populated by `apps/api/prisma/seeds/01b-site-templates.seed.ts`, which runs as part of the full `pnpm seed` orchestrator. If a dev database was provisioned before the seed was added (or the seed was skipped), the table will be empty and the Website tab in the IMS will show an empty template gallery.

Fastest fix: `INSERT` the four templates directly. Idempotent (keyed on `slug`).

```sql
-- Connect: docker exec -it dev_db psql -U postgres -d ims
INSERT INTO site_templates (id, slug, name, description, tier, preview_image_url, default_branding, default_sections, is_active, sort_order, created_at, updated_at) VALUES
  (gen_random_uuid(), 'minimal',  'Minimal',  'Clean, fast, type-forward.', 'MINIMAL',  NULL,
    '{"colors":{"primary":"#111111","accent":"#F5F5F5","background":"#FFFFFF","text":"#111111"},"typography":{"heading":"Inter","body":"Inter"},"theme":"light"}'::jsonb,
    '{"hero":true,"products":true,"contact":true}'::jsonb,
    true, 10, NOW(), NOW()),
  (gen_random_uuid(), 'standard', 'Standard', 'Balanced default template.',  'STANDARD', NULL,
    '{"colors":{"primary":"#1E40AF","accent":"#F59E0B","background":"#FFFFFF","text":"#0F172A"},"typography":{"heading":"Poppins","body":"Inter"},"theme":"light"}'::jsonb,
    '{"hero":true,"products":true,"categories":true,"contact":true}'::jsonb,
    true, 20, NOW(), NOW()),
  (gen_random_uuid(), 'luxury',   'Luxury',   'Dark, editorial layout.',     'LUXURY',   NULL,
    '{"colors":{"primary":"#B8860B","accent":"#0A0A0A","background":"#0A0A0A","text":"#F5F5F5"},"typography":{"heading":"Playfair Display","body":"Inter"},"theme":"dark"}'::jsonb,
    '{"hero":true,"products":true}'::jsonb,
    true, 30, NOW(), NOW()),
  (gen_random_uuid(), 'boutique', 'Boutique', 'Warm, story-driven.',         'BOUTIQUE', NULL,
    '{"colors":{"primary":"#8B4513","accent":"#FFF5E6","background":"#FFF5E6","text":"#3E2723"},"typography":{"heading":"Cormorant Garamond","body":"Lora"},"theme":"light"}'::jsonb,
    '{"hero":true,"story":true,"products":true}'::jsonb,
    true, 40, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
```

Long-term, run the full seed instead: `pnpm --filter api seed` on the host (or a new `deploy/dev/seed-sites.sh` helper if you want just the site templates).

### 14.8 End-to-end test with a fake hostname (no real DNS needed)

You don't need a real DNS name to validate the full dev_caddy → dev_tenant_site → dev_api → dev_db → renderer pipeline. Caddy's TLS path requires real DNS (ACME needs to reach the server via HTTP-01), but every other layer can be exercised by directly curl-ing `dev_tenant_site:3100` from inside the docker network with a `Host:` header.

**Setup (one-time per tenant, via SQL — idempotent upserts):**

```sql
-- Target tenant: demo (has 36 seeded products)
-- 1. SiteConfig: enable website feature, pick 'standard', publish
INSERT INTO site_configs (id, tenant_id, website_enabled, template_id, branding, contact, features, seo, is_published, created_at, updated_at)
SELECT
  gen_random_uuid(),
  t.id,
  true,
  (SELECT id FROM site_templates WHERE slug='standard'),
  '{"name":"Shaman Demo Store","tagline":"Crafted with intention since 1998","colors":{"primary":"#1E40AF","accent":"#F59E0B","background":"#FFFFFF","text":"#0F172A"},"theme":"light"}'::jsonb,
  '{"email":"hello@shaman-demo.test","phone":"+977 98XXX XXXXX","address":"Kathmandu, Nepal"}'::jsonb,
  '{"hero":true,"products":true,"categories":true,"contact":true}'::jsonb,
  '{"title":"Shaman Demo Store — Handcrafted Furniture","description":"Test tenant site for end-to-end validation."}'::jsonb,
  true,
  NOW(), NOW()
FROM tenants t WHERE t.slug='demo'
ON CONFLICT (tenant_id) DO UPDATE SET
  website_enabled = EXCLUDED.website_enabled,
  template_id = EXCLUDED.template_id,
  branding = EXCLUDED.branding,
  is_published = EXCLUDED.is_published,
  updated_at = NOW();

-- 2. Pre-verified TenantDomain with a private-looking hostname
INSERT INTO tenant_domains (id, tenant_id, hostname, app_type, is_primary, verify_token, verified_at, tls_status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  t.id,
  'test.shaman.local',
  'WEBSITE',
  true,
  'e2e-test-' || md5(random()::text),
  NOW(),           -- pre-verified; skips the real DNS TXT flow
  'PENDING',
  NOW(), NOW()
FROM tenants t WHERE t.slug='demo'
ON CONFLICT (hostname) DO UPDATE SET verified_at = NOW(), updated_at = NOW();
```

**Test matrix** (run from the EC2 host; the helper `curl_in` routes through a throwaway curl container on the same docker network so it can resolve `dev_tenant_site` by name):

```bash
NET=$(docker network ls --format '{{.Name}}' | grep -E 'dev$|ims-dev' | head -1)
curl_in() { docker run --rm --network "$NET" curlimages/curl:latest -sS "$@"; }

# 1. Home page — expect HTTP 200 with branded HTML
curl_in -o /dev/null -w 'HTTP %{http_code}\n' \
  -H 'Host: test.shaman.local' http://dev_tenant_site:3100/

# 2. Products list — expect 200
curl_in -o /dev/null -w 'HTTP %{http_code}\n' \
  -H 'Host: test.shaman.local' http://dev_tenant_site:3100/products

# 3. Product detail — pick first product ID from the list page
PID=$(curl_in -H 'Host: test.shaman.local' http://dev_tenant_site:3100/products \
  | grep -oE 'href="/products/[a-f0-9-]+"' | head -1 \
  | sed 's|href="/products/||;s|"||')
curl_in -o /dev/null -w 'HTTP %{http_code}\n' \
  -H 'Host: test.shaman.local' "http://dev_tenant_site:3100/products/$PID"

# 4. Contact page — expect 200
curl_in -o /dev/null -w 'HTTP %{http_code}\n' \
  -H 'Host: test.shaman.local' http://dev_tenant_site:3100/contact

# 5. Unknown host → expect 404 (middleware 404s before any page handler)
curl_in -o /dev/null -w 'HTTP %{http_code}\n' \
  -H 'Host: phantom.example' http://dev_tenant_site:3100/

# 6. /healthz and /robots.txt — middleware bypass, always 200
curl_in -o /dev/null -w 'HTTP %{http_code}\n' http://dev_tenant_site:3100/healthz
curl_in -o /dev/null -w 'HTTP %{http_code}\n' http://dev_tenant_site:3100/robots.txt

# 7. /api/revalidate without secret → 401
curl_in -o /dev/null -w 'HTTP %{http_code}\n' \
  -X POST -H 'content-type: application/json' \
  -d '{"tags":["tenant:foo:site"]}' \
  http://dev_tenant_site:3100/api/revalidate

# 8. /api/revalidate with correct secret → 200
SECRET=$(grep '^REVALIDATE_SECRET=' ~/deploy/.env | cut -d= -f2)
curl_in -o /dev/null -w 'HTTP %{http_code}\n' \
  -X POST -H 'content-type: application/json' \
  -H "x-revalidate-secret: ${SECRET}" \
  -d '{"tags":["tenant:foo:site"]}' \
  http://dev_tenant_site:3100/api/revalidate
```

**Body check** — pull a snippet of the rendered home page and grep for markers that only show up if the full pipeline resolved the tenant, fetched SiteConfig, and picked the right template:

```bash
curl_in -H 'Host: test.shaman.local' http://dev_tenant_site:3100/ \
  | grep -oE '(Shaman Demo Store|Crafted with intention|data-template="[a-z]+")' \
  | sort -u
# Expected:
#   Crafted with intention
#   Shaman Demo Store
#   data-template="standard"
```

If all 8 status codes match and the body markers are present, the full renderer pipeline is validated **except** for Caddy's TLS/ACME path, which only reachs Let's Encrypt when a real DNS name is pointed at the host.

### 14.9 Hotfixing a compiled artifact in a running container (runtime patch)

When you need to validate a fix on the server **right now** — before waiting for CI to build + Watchtower to pull — you can patch the compiled `dist/` output inside the running container. The change is deliberately non-persistent; Watchtower's next image restart wipes it, at which point the proper source fix (merged via PR) takes over automatically.

```bash
# Example: the hostnameResolver.ts fix in PR #351, validated before Watchtower pulled
ssh ims_dev
docker exec -u 0 dev_api node -e '
  const fs = require("fs");
  const p = "./apps/api/dist/middlewares/hostnameResolver.js";
  const src = fs.readFileSync(p, "utf8");
  const old  = `const hostname = (req.hostname || "").toLowerCase();`;
  const fresh = `const __xfh = req.headers ? req.headers["x-forwarded-host"] : undefined;` +
                ` const __first = Array.isArray(__xfh) ? __xfh[0] : __xfh;` +
                ` const __fromHeader = typeof __first === "string" && __first.length > 0 ? (__first.split(",")[0] || "").trim().split(":")[0] : "";` +
                ` const hostname = (__fromHeader || req.hostname || "").toLowerCase();`;
  if (!src.includes(old)) { console.error("marker not found — source drift?"); process.exit(1); }
  fs.writeFileSync(p, src.replace(old, fresh));
  console.log("patched");
'

# Restart the container so node reloads the module
docker restart dev_api
```

**Rules:**

- Always `-u 0` (root) because the compiled `dist/` is owned by the non-root runtime user in the multi-stage build.
- Always match a **unique source marker** so the patch fails loud if the underlying code has drifted — don't blindly `sed`.
- Always ship a real PR with the same fix afterward. The runtime patch is a validator, not a fix. If you forget to push the PR, Watchtower will silently replace it on the next image build.
- Never do this on prod. If you're tempted to runtime-patch prod, the thing you actually want is a proper hotfix PR + release + Watchtower pull.

---

## 15. Glossary additions (from §13–§14)

- **On-demand TLS** — Caddy's feature for issuing certs the first time a hostname is requested, rather than ahead of time. Must be gated by an `ask` hook to prevent abuse.
- **ACME** — Automatic Certificate Management Environment, the protocol Let's Encrypt uses to issue certs. Caddy speaks it natively.
- **SNI (Server Name Indication)** — The TLS extension that lets a server host multiple hostnames on one IP. Caddy reads the SNI field to pick the right cert.
- **Cache tag / revalidateTag** — Next.js 15's mechanism for invalidating specific cached fetches on demand. We tag every fetch with `tenant:${id}:*` so the API can flush them per tenant.
- **docker-compose profile** — A way to mark services as "only started when a named profile is active." We use `profiles: ["websites"]` so `docker compose up` without `--profile websites` leaves the new services alone.
- **Fail-closed** — A security posture where missing/invalid configuration causes requests to be denied rather than silently allowed. The `requireInternalToken` middleware is fail-closed.
- **Stream passthrough (SNI routing)** — An nginx mode where TLS is terminated at the upstream (Caddy) instead of at nginx, with nginx just forwarding the TCP stream based on SNI. Not used in the current dev setup (we chose Caddy-at-:443 instead) but mentioned in §14.5 as a prod alternative.
- **Forbidden header name** — A list defined by the WHATWG Fetch spec of HTTP request headers that browser `fetch()` and Node's `undici` are not allowed to set or override. Includes `Host`, `Content-Length`, `Connection`, and ~20 others. Attempting to set one via `headers: { host: '...' }` silently does nothing — the runtime uses the TCP-level hostname instead. Hit us in PR #351 (see §16.2).

---

## 16. Dev cutover retrospective (2026-04-13)

The dev Caddy cutover went end-to-end green on the first serious attempt, but it took three unplanned hotfixes to get there. All three are documented below so the prod cutover doesn't step on the same mines.

### 16.1 Hotfix #1 — tenant-site Docker build failed on first CI push (PR #350)

**Symptom:** The first manual dispatch of `Build and Push (Staging)` with `stage=tenant-site` failed in the final stage:

```
COPY --from=builder --chown=nextjs:nodejs /repo/apps/tenant-site/public ./apps/tenant-site/public
ERROR: failed to calculate checksum of ref ...: "/repo/apps/tenant-site/public": not found
```

**Root cause:** I created `apps/tenant-site/public/` in the scaffold but never added any files to it. Git doesn't track empty directories, so the directory simply didn't exist in the Docker build context, and `COPY public ./...` failed.

**Additional cleanup in the same PR:**

- **Next 16 dropped `experimental.trustHostHeader`.** I copied the option over from a Next 15 doc and Next 16 warned on startup:

  ```
  ⚠ Unrecognized key(s) in object: 'trustHostHeader' at "experimental"
  ```

  The behavior is now the default (incoming `Host` header reflects the customer-facing domain from Caddy automatically), so the option was pure noise. Removed.

- **`next-env.d.ts` needed updating** — Next 16 auto-generates a `routes.d.ts` reference in it, which shows up as an uncommitted diff on every fresh build. Committed the regenerated file.

**Fix:** PR #350 — `apps/tenant-site/public/.gitkeep`, drop the experimental flag, commit the regenerated `next-env.d.ts`. Local `pnpm --filter tenant-site build` then compiles cleanly.

**Takeaway for prod:** None of the three issues are environment-specific, so once PR #350 is merged (it is) the same build Just Works on prod. But the class of bug — **empty directories not being in the build context** — is worth flagging for any future Dockerized Next.js app we add.

### 16.2 Hotfix #2 — Node fetch silently drops the `Host` header (PR #351)

**Symptom:** After the Caddy cutover succeeded and `/internal/*` endpoints smoke-tested clean, the actual tenant-site SSR render returned HTTP 404 for every request. Both known hosts (`test.shaman.local`) and unknown hosts (`phantom.example`) 404'd. The response body contained `NEXT_HTTP_ERROR_FALLBACK;404` — a Next.js synthetic 404 from a server component calling `notFound()`.

**Debugging trail (captured here so future-you doesn't retrace it):**

1. **Middleware appeared to work.** The RootLayout ran (the `<title>` reflected the tenant's SiteConfig), which meant `getTenantContext()` inside `app/layout.tsx` succeeded. So the middleware had resolved the host and attached the `x-tenant-id` / `x-host` headers correctly.
2. **The 404 came from `page.tsx`.** That file calls `getSite()` a second time (the layout has its own call, and page re-fetches) and runs `if (!site) notFound()`. Something was making the second `getSite()` return `null`.
3. **Direct `wget` from inside `dev_tenant_site` → `dev_api:4000/internal/resolve-host` worked.** Returned the correct tenantId. So the token, URL, and API were all fine.
4. **Direct Node `fetch` from inside `dev_tenant_site` → `dev_api:4000/api/v1/public/site` with `headers: { host: "test.shaman.local" }` returned HTTP 404 with `{"message":"Unknown host dev_api"}`.** The API was seeing `req.hostname === "dev_api"` — the docker upstream name — instead of the customer-facing host we tried to pass.

**Root cause:** The WHATWG Fetch specification lists `Host` as a **forbidden request header name**. Browser `fetch()` is required to drop it, and Node's `undici` fetch (the engine behind Node's built-in `fetch`) enforces the same rule. So `lib/api.ts`'s attempt to forward the customer's Host via:

```ts
await fetch(`${API}/public/site`, {
  headers: { host: opts.host, "x-forwarded-host": opts.host },
});
```

...silently dropped the `host` entry and only sent `x-forwarded-host`. The API's `hostnameResolver` middleware was reading `req.hostname` only (derived by Express from the TCP-level Host header, which was `dev_api`), so the header made no difference.

**Fix:** PR #351 — `hostnameResolver.ts` now checks `X-Forwarded-Host` first, falls back to `req.hostname`. One file, ~15 lines, 4 new test cases. No tenant-site-side changes (it was already setting `X-Forwarded-Host`).

**Runtime patch trick** (for future hotfixes): we couldn't wait for CI, so we patched `dist/middlewares/hostnameResolver.js` inside the running `dev_api` container with `docker exec -u 0 dev_api node -e '...'`, restarted the container, and validated end-to-end. Watchtower replaced the patch with the proper source fix once CI finished. See **§14.9** for the recipe.

**Takeaway for prod:**

- The fix is already merged. Prod will pick it up naturally when `rpandox/dev-api-ims:prod` gets rebuilt.
- **Don't pass `host` as a `headers:` key in any Node `fetch()` call.** Use `X-Forwarded-Host` and make sure the receiver honors it. This applies to any future server-to-server call in the codebase, not just tenant-site.
- **Lesson for unit tests:** our resolver tests mocked `req` as `{ hostname: "www.acme.com" }` without a `headers` field, so the X-Forwarded-Host code path was never exercised in unit tests — only E2E on dev surfaced it. We've added explicit header-presence test cases to cover this.

### 16.3 Hotfix #3 — `site_templates` was empty on dev (manual SQL)

**Symptom:** After the cutover, the `demo` tenant's Website tab in the IMS showed an empty template gallery, and any attempt to "Enable website" via the API returned 404 on `/platform/site-templates`.

**Root cause:** The seed file `apps/api/prisma/seeds/01b-site-templates.seed.ts` was added in PR #348 but runs as part of the full orchestrated seed (`pnpm seed`), which is only executed manually on the deploy host. The dev DB was provisioned before that seed existed, and the orchestrated seed hadn't been re-run.

**Fix:** Direct SQL insert of the four templates, idempotent on `ON CONFLICT (slug)`. See **§14.7** for the copy-paste SQL.

**Takeaway for prod:**

- Before running `setup-caddy.sh` on prod, **also run the template insert SQL** (or a fresh `pnpm seed`).
- Longer term we should add a dedicated `deploy/prod/seed-sites.sh` helper that runs just the site templates seed without touching any other data. That avoids the "run a full seed on prod" footgun.

### 16.4 What went right

- **The `--profile websites` compose gate** meant none of these hotfixes affected the existing IMS / API / web stack. We could iterate on the Caddy + tenant-site pair without ever risking `dev_web`.
- **Pre-flight smoke tests** (the curl matrix against `/internal/*` before stopping nginx) caught the auth flow but not the SSR bug — because the SSR bug only manifests when Node's `fetch` is the caller, not curl. Future runbooks should add a **tenant-site-initiated** smoke test to the pre-flight, not just direct-to-API.
- **The TLS fallback** — Caddy's ACME picked up fresh Let's Encrypt certs for both platform hostnames on first startup (the certs from the previous nginx run went with nginx to `/etc/letsencrypt` which we didn't touch). First-request latency was sub-second after the handshake completed.

---

## 17. Lessons learned (for the next rollout like this)

1. **Empty directories are invisible to Docker.** Every Dockerized Next.js app in this repo should have a tracked `apps/<name>/public/.gitkeep` (or equivalent) so the multi-stage `COPY public` step doesn't brick a first build. Consider adding a pre-commit check.
2. **Node `fetch` drops `Host`, silently.** If you ever need to make a server-to-server call that the receiver will route by hostname, use `X-Forwarded-Host` and make sure the receiver's middleware reads it. Never rely on `headers: { host: '...' }` working in Node's `fetch`. Same for `Content-Length` (forbidden), `Connection` (forbidden), `Cookie` in some contexts, etc. — consult the Fetch spec's Forbidden Header List when in doubt.
3. **Unit tests that mock request objects need real header shapes.** Our `hostnameResolver.test.ts` was mocking `{ hostname: "..." } as Request` — no `headers` field — which meant the X-Forwarded-Host branch was dead code in tests. Prefer mocking the full `{ hostname, headers }` shape, ideally via a shared `makeReq()` test helper.
4. **Compose profiles are a good risk-management tool.** `profiles: ["websites"]` let us add `dev_caddy` + `dev_tenant_site` to the main `docker-compose.yml` without affecting the default stack. A single `--profile websites` opt-in turns it on; no opt-in needed leaves everything untouched. Much safer than a second compose file.
5. **Runtime patching the compiled `dist/` output is faster than waiting for CI.** Use it to validate a fix before merging, never as a substitute for merging. Watchtower replaces it within 30 seconds of the next image build anyway.
6. **Pre-flight smoke tests should exercise every caller, not just the one you know.** We had a curl-from-host test for `/internal/*`. That passed. The thing that failed was a Node-`fetch`-from-tenant-site call, which has different header-handling rules than curl. Future pre-flights should test the full caller matrix.
7. **Let's Encrypt has a 50 certs per registered domain per week limit.** The `ask` hook is the only thing that keeps us from burning through that budget via `on_demand_tls` abuse. Test the ask hook rejection path (unknown host → 403) before opening `on_demand_tls` to real traffic.
8. **Seed scripts that run only on full orchestrated `pnpm seed` calls are landmines.** They're correct locally, but deploys happen in an environment where `pnpm seed` is an explicit one-off. Any new seed needs a corresponding `deploy/<env>/seed-<thing>.sh` helper OR needs to be run as part of the migration pipeline. Otherwise the new table stays empty in every deployed environment until someone notices.
9. **Docker Hub private repos aren't auto-created on push.** If your `DOCKERHUB_TOKEN` has namespace-wide write access and the existing repos are public, new repos are auto-created. If they're private, you must pre-create them in the Docker Hub UI. Check which flavor you're on before the first CI push.
10. **Always confirm `req.headers` exists before reading a header.** My `resolveRequestHostname(req)` helper was initially `req.headers["x-forwarded-host"]`, which throws if `req.headers` is undefined. The existing unit tests all mocked `req` without a `headers` field. Switched to `req.headers?.["x-forwarded-host"]` and kept the tests passing without a rewrite.

---

## 18. Blog system

Phase A of the content expansion: a tenant-scoped blog with a markdown editor,
public rendering on the tenant-site, and cache-tag driven revalidation. Ships
under the existing `TENANT_WEBSITES` flag — if the website feature is off, the
blog is off.

### 18.1 Data model

Three new tables:

| Table                   | Purpose                                       | Key fields                                                                                                                                                                              |
| ----------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blog_categories`       | Optional grouping (Stories / Craft / Updates) | `tenantId`, `slug`, `name`, `sortOrder`                                                                                                                                                 |
| `blog_posts`            | Every article, draft or published             | `tenantId`, `slug`, `title`, `bodyMarkdown`, `status` (DRAFT/PUBLISHED/ARCHIVED), `publishedAt`, `categoryId`, `tags[]`, `seoTitle`, `seoDescription`, `heroImageUrl`, `readingMinutes` |
| — enum `BlogPostStatus` | DRAFT / PUBLISHED / ARCHIVED                  |                                                                                                                                                                                         |

Composite unique: `(tenantId, slug)` for both tables — two tenants can both
have `/blog/welcome`.

Tags are a Postgres `String[]` on `blog_posts` — no separate tag table yet.
Adds a GIN index if/when we need faceted search.

`readingMinutes` is computed at write-time from the markdown body (200wpm
heuristic, stripping fenced code blocks) and stored, so reads don't recompute.

Migration: `apps/api/prisma/migrations/20260415120000_add_blog_posts_and_categories`.

### 18.2 Routes

**Tenant admin (JWT, admin/superAdmin, feature-flagged):**

| Method   | Path                                                   | Purpose                                                                 |
| -------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `GET`    | `/blog/posts?page=&limit=&status=&categoryId=&search=` | Paginated list                                                          |
| `POST`   | `/blog/posts`                                          | Create a draft                                                          |
| `GET`    | `/blog/posts/:id`                                      | Get one post (full body)                                                |
| `PATCH`  | `/blog/posts/:id`                                      | Update                                                                  |
| `POST`   | `/blog/posts/:id/publish`                              | Flip to PUBLISHED, set `publishedAt` on first publish only              |
| `POST`   | `/blog/posts/:id/unpublish`                            | Back to DRAFT                                                           |
| `DELETE` | `/blog/posts/:id`                                      | Delete                                                                  |
| `GET`    | `/blog/categories`                                     | List                                                                    |
| `POST`   | `/blog/categories`                                     | Create                                                                  |
| `PATCH`  | `/blog/categories/:id`                                 | Update                                                                  |
| `DELETE` | `/blog/categories/:id`                                 | Delete — posts in the deleted category fall back to `categoryId = null` |

**Public (no auth, hostname-resolved, published-only):**

| Method | Path                                                 | Purpose                                                          |
| ------ | ---------------------------------------------------- | ---------------------------------------------------------------- |
| `GET`  | `/public/blog/posts?page=&limit=&categorySlug=&tag=` | Paginated list of PUBLISHED posts with `publishedAt <= now()`    |
| `GET`  | `/public/blog/posts/:slug`                           | One post + 3 related from the same category                      |
| `GET`  | `/public/blog/featured?limit=3`                      | Latest N published posts for homepage "From the journal" section |
| `GET`  | `/public/blog/categories`                            | All categories with published-post counts                        |

Unknown slug → **404** (never 403) to avoid leaking post existence.

### 18.3 Tenant-site rendering

Four new route paths under `apps/tenant-site/app/blog/`:

- `/blog` — paginated listing with category chips + featured top card
- `/blog/[slug]` — article page with hero, markdown body, tag footer, related posts
- `/blog/category/[slug]` — filtered listing
- `/blog/tag/[tag]` — filtered listing by tag

All four share `components/blog/BlogPageShell.tsx` which reuses the template's
`SiteHeader` + `SiteFooter` so the chrome is consistent with the homepage.

Homepage integration: each of the four templates (`Minimal`, `Standard`,
`Luxury`, `Boutique`) renders `<FeaturedBlogSection posts={...} />` between
the product grid and the footer. Empty array → section renders nothing.

### 18.4 Markdown stack (XSS posture)

```
markdown → react-markdown
         ↓  remark-gfm         (tables, strikethrough, task lists)
         ↓  rehype-slug        (stable anchor IDs)
         ↓  rehype-autolink-headings
         ↓  rehype-sanitize    ← strips <script>, <iframe>, on* handlers, etc.
         → HTML
```

**Defense in depth**: the editor only ever stores markdown, not HTML, so there
is no HTML to sanitize at write time. At read time `rehype-sanitize` uses the
default safe schema. Any future switch to a WYSIWYG editor (Phase B / TipTap)
must preserve both layers.

### 18.5 Cache tags

| Tag                       | What it covers                                                     | Fires on                                                |
| ------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| `tenant:<id>:blog`        | `/blog`, `/blog/category/*`, `/blog/tag/*`, `getFeaturedBlogPosts` | Any post/category mutation                              |
| `tenant:<id>:blog:<slug>` | `/blog/[slug]`                                                     | That post's mutations (both old and new slug on rename) |
| `tenant:<id>:site`        | Homepage (featured-blog section reads from this tag)               | Any post mutation                                       |

`revalidateBlog(tenantId, { slug? })` in `apps/api/src/modules/blog/blog.revalidate.ts`
fires the same HTTP call as `revalidateTenantSite` — just with the blog tag
list. Non-fatal on failure (2s timeout, logs, moves on).

### 18.6 Admin UI (nested tab)

`/settings/site` becomes a tabbed layout:

| Tab         | URL                                    | What                                                    |
| ----------- | -------------------------------------- | ------------------------------------------------------- |
| Website     | `/{workspace}/settings/site`           | Branding, contact, template, publish (unchanged)        |
| Blog        | `/{workspace}/settings/site/blog`      | Post list + filters, New post button, Categories dialog |
| Blog — new  | `/{workspace}/settings/site/blog/new`  | Create form                                             |
| Blog — edit | `/{workspace}/settings/site/blog/[id]` | Edit form                                               |

The tab nav lives in `SiteTabsNav.tsx` (link-based, not shadcn `Tabs`, so
each tab can have its own URL and visitors can deep-link).

Both tabs are wrapped at the layout level (`site/layout.tsx`) with
`<EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>` +
`<AuthGuard roles={["admin","superAdmin"]}>`, so page files stay minimal.

**Editor UX:**

- Split-pane markdown (textarea left, live preview right) — same `react-markdown`
  stack as the renderer, so WYSIWYG stays honest.
- Thin toolbar: **B**, **I**, **H2**, **H3**, bullet, link, quote, code.
- Slug auto-generated from title until the user manually edits the slug field
  (`slugTouched` guards the auto-gen).
- Tags parsed from a single comma-separated input. Lowercase, deduped, capped at 20.
- SEO accordion at the bottom with a live Google-style preview. Falls back to
  title / excerpt when the SEO fields are blank.
- Hero image: plain URL input for Phase A. Phase B adds a media picker.
- Publish / Unpublish button only appears in edit mode and fires a separate
  endpoint (not part of the save payload).

### 18.7 Seed data

`apps/api/prisma/seeds/27-demo-blog.seed.ts`: 3 categories (`stories`, `craft`,
`updates`), 6 posts (4 published + 2 draft) for the `demo` tenant only.
Idempotent via `upsert` on `(tenantId, slug)`. Also ensures demo tenant has
`SiteConfig.websiteEnabled = true, isPublished = true` so the blog routes
actually render without needing platform admin UI.

Runs as the last step of `fullTenantSeed` — only applied to the `demo` slug.

### 18.8 Test counts (Phase A)

| Area                                                                | Tests   |
| ------------------------------------------------------------------- | ------- |
| `apps/api` blog (schema / repo / service / controller / revalidate) | 45      |
| `apps/api` public-blog (schema / service / controller)              | 21      |
| `apps/web` tenant-blog (service + validation)                       | 34      |
| **Total Phase A**                                                   | **100** |

(All green. Full API suite still flaky on the 6 `automation.integration.test.ts`
tests that need a real DB — pre-existing, unrelated to blog.)

### 18.9 Sitemap

`apps/tenant-site/app/sitemap.ts` now emits:

- `/` `/products` `/contact` `/blog`
- One entry per **published** blog post at `/blog/<slug>` with `lastModified = publishedAt`
- One entry per blog category that has `postCount > 0` at `/blog/category/<slug>`

Pagination is handled at generation time with a 50-per-page cap and a 20-page
safety limit (1000 posts max per tenant in the sitemap).

### 18.10 Out of scope for Phase A

- Media picker / S3 browser for hero image → **Phase B**
- WYSIWYG (TipTap) editor → **Phase B**
- Scheduled publishing (`publishedAt` in the future)
- Post revisions / history
- Comments / reactions
- RSS feed (`/blog/rss.xml`) — easy follow-up
- i18n per post
- Author as a User FK (we store a plain `authorName` string for now, since
  marketing staff writing posts may not have IMS accounts)

### 18.11 Editor runbook (§14 addition)

> **Write a post on the demo tenant (dev):**
>
> 1. Log into stage IMS as a demo admin.
> 2. Top nav → Settings → Website card → **Blog** tab.
> 3. Click **New post**. Title, slug (auto-filled), body in markdown.
> 4. Save — creates a DRAFT and redirects to the edit page.
> 5. Click **Publish**. The revalidate hook fires within ~2s.
> 6. Visit `https://<tenant-host>/blog` — the post is live.
>
> **Unpublish / delete:** Edit post → **Unpublish** (back to DRAFT) or trash
> icon in the list view (hard delete, revalidates the slug tag so the public
> URL 404s on next visit).
