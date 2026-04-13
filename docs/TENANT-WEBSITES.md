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

## 9. Rollout status by phase

| #   | Piece                                                               | Status | Shipped in                     |
| --- | ------------------------------------------------------------------- | ------ | ------------------------------ |
| 1   | Data model + migrations                                             | ✅     | PR #348                        |
| 2   | Platform admin domain + website management (API)                    | ✅     | PR #348                        |
| 3   | Tenant-scoped `/sites/*` API                                        | ✅     | PR #348                        |
| 4   | Public `/public/*` API + hostname resolver                          | ✅     | PR #348                        |
| 5   | Platform admin UI (domains + website + template picker)             | ✅     | PR #348                        |
| 6   | Tenant site editor UI (branding + contact + SEO)                    | ✅     | PR #348                        |
| 7   | `/internal/*` endpoints (Caddy ask hook, tenant-site host resolver) | ✅     | PR #349                        |
| 8   | Caddy edge proxy (containerized, on_demand_tls) — **dev only**      | ✅     | PR #349                        |
| 9   | `apps/tenant-site` Next.js SSR renderer (4 templates)               | ✅     | PR #349                        |
| 10  | Cache-tag revalidation (API → tenant-site webhook)                  | ✅     | PR #349                        |
| 11  | Prod Caddy cutover                                                  | ⏳     | Separate PR after 72h dev soak |
| 12  | HSTS preload submission                                             | ⏳     | After prod cutover             |

The remaining items are deliberately out of scope for the current PR. The dev soak window is the gating signal — we don't touch prod Caddy until dev has been serving tenant traffic without incident for 72+ hours. See **§14 Runbooks** for the prod cutover checklist when the time comes.

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
cd /home/ubuntu/projectX/deploy/dev
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

| What                    | Where                                                   |
| ----------------------- | ------------------------------------------------------- |
| Caddy access logs       | `docker logs dev_caddy` (JSON)                          |
| Caddy ACME activity     | `docker logs dev_caddy \| grep -i acme`                 |
| Internal endpoint calls | `docker logs dev_api \| grep internal/`                 |
| Revalidation hits       | `docker logs dev_tenant_site \| grep revalidate`        |
| Tenant-site SSR errors  | `docker logs dev_tenant_site \| grep '\[tenant-site\]'` |
| Prometheus counters     | `/metrics` on `dev_api:4000` (existing endpoint)        |

---

## 15. Glossary additions (from §13–§14)

- **On-demand TLS** — Caddy's feature for issuing certs the first time a hostname is requested, rather than ahead of time. Must be gated by an `ask` hook to prevent abuse.
- **ACME** — Automatic Certificate Management Environment, the protocol Let's Encrypt uses to issue certs. Caddy speaks it natively.
- **SNI (Server Name Indication)** — The TLS extension that lets a server host multiple hostnames on one IP. Caddy reads the SNI field to pick the right cert.
- **Cache tag / revalidateTag** — Next.js 15's mechanism for invalidating specific cached fetches on demand. We tag every fetch with `tenant:${id}:*` so the API can flush them per tenant.
- **docker-compose profile** — A way to mark services as "only started when a named profile is active." We use `profiles: ["websites"]` so `docker compose up` without `--profile websites` leaves the new services alone.
- **Fail-closed** — A security posture where missing/invalid configuration causes requests to be denied rather than silently allowed. The `requireInternalToken` middleware is fail-closed.
- **Stream passthrough (SNI routing)** — An nginx mode where TLS is terminated at the upstream (Caddy) instead of at nginx, with nginx just forwarding the TCP stream based on SNI. Not used in the current dev setup (we chose Caddy-at-:443 instead) but mentioned in §14.5 as a prod alternative.
