# Feature List — Release 1.0.0

This document lists all implemented features as present in the codebase. No speculation; no TODOs.

## 1. Feature Table

| Feature name                                | Type       | Entry point                          | Required role(s)                                                                                        | Environment        | Feature flag | Stability |
| ------------------------------------------- | ---------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------ | ------------ | --------- |
| API root                                    | System     | GET /api/v1/                         | None (public)                                                                                           | Dev, Staging, Prod | Always ON    | STABLE    |
| Health check                                | System     | GET /health                          | None (public)                                                                                           | Dev, Staging, Prod | Always ON    | STABLE    |
| API docs                                    | System     | GET /api-docs                        | None (public)                                                                                           | Dev, Staging, Prod | Always ON    | STABLE    |
| Auth login                                  | User       | POST /api/v1/auth/login              | None (public)                                                                                           | Dev, Staging, Prod | Always ON    | STABLE    |
| Auth me                                     | User       | GET /api/v1/auth/me                  | Authenticated                                                                                           | Dev, Staging, Prod | Always ON    | STABLE    |
| Auth logout                                 | User       | POST /api/v1/auth/logout             | Authenticated                                                                                           | Dev, Staging, Prod | Always ON    | STABLE    |
| Users CRUD                                  | Admin      | /api/v1/users/\*                     | superAdmin                                                                                              | Dev, Staging, Prod | Always ON    | STABLE    |
| Categories + subcategories                  | User/Admin | /api/v1/categories/\*                | admin/superAdmin (write); user+ (read)                                                                  | Dev, Staging, Prod | Always ON    | STABLE    |
| Products (CRUD, bulk, discounts, templates) | User/Admin | /api/v1/products/\*                  | admin/superAdmin (write); user+ (read)                                                                  | Dev, Staging, Prod | Always ON    | STABLE    |
| Vendors                                     | User/Admin | /api/v1/vendors/\*                   | admin/superAdmin (write); user+ (read)                                                                  | Dev, Staging, Prod | Always ON    | STABLE    |
| Locations                                   | Admin/User | /api/v1/locations/\*                 | superAdmin (create/delete); user+ (read/update)                                                         | Dev, Staging, Prod | Always ON    | STABLE    |
| Inventory                                   | User/Admin | /api/v1/inventory/\*                 | admin/superAdmin (adjust/set); user+ (read)                                                             | Dev, Staging, Prod | Always ON    | STABLE    |
| Transfers                                   | User/Admin | /api/v1/transfers/\*                 | admin/superAdmin (create/approve/transit/complete/cancel); user+ (read)                                 | Dev, Staging, Prod | Always ON    | STABLE    |
| Members                                     | User/Admin | /api/v1/members/\*                   | admin/superAdmin (write/bulk); user+ (read)                                                             | Dev, Staging, Prod | Always ON    | STABLE    |
| Sales                                       | User/Admin | /api/v1/sales/\*                     | admin/superAdmin (summary/bulk); user+ (create/read)                                                    | Dev, Staging, Prod | Always ON    | STABLE    |
| Promos                                      | User/Admin | /api/v1/promos/\*                    | admin/superAdmin (write); user+ (read)                                                                  | Dev, Staging, Prod | Always ON    | STABLE    |
| Audit logs                                  | Admin      | GET /api/v1/audit-logs               | superAdmin                                                                                              | Dev, Staging, Prod | Always ON    | STABLE    |
| Error reports                               | User/Admin | POST/GET/PATCH /api/v1/error-reports | user+ (create); superAdmin (list/update)                                                                | Dev, Staging, Prod | Always ON    | STABLE    |
| Analytics                                   | User/Admin | /api/v1/analytics/\*                 | Mixed per endpoint (see boundaries)                                                                     | Dev, Staging, Prod | Always ON    | STABLE    |
| Dashboard                                   | User/Admin | /api/v1/dashboard/\*                 | user/admin/superAdmin (user-summary); admin/superAdmin (admin-summary); superAdmin (superadmin-summary) | Dev, Staging, Prod | Always ON    | STABLE    |
| Web login                                   | User       | /login                               | None                                                                                                    | Dev, Staging, Prod | Always ON    | STABLE    |
| Web 401                                     | User       | /401                                 | None                                                                                                    | Dev, Staging, Prod | Always ON    | STABLE    |
| Web workspace (admin)                       | User/Admin | /[workspace]/(admin)/\*              | Authenticated (admin routes)                                                                            | Dev, Staging, Prod | Always ON    | STABLE    |
| Web workspace (superadmin)                  | Admin      | /[workspace]/(superadmin)/\*         | superAdmin                                                                                              | Dev, Staging, Prod | Always ON    | STABLE    |

## 2. Feature Boundaries

### API root (GET /api/v1/)

- **Does:** Returns message and application version.
- **Does not:** Require auth; expose config or secrets.
- **Preconditions:** None.
- **Failure behavior:** Standard 5xx via error handler; 408 on request timeout (30s).

### Health (GET /health)

- **Does:** Returns status (healthy/unhealthy), timestamp, database connected/disconnected, version.
- **Does not:** Require auth; expose internal details.
- **Preconditions:** None.
- **Failure behavior:** 503 if DB unreachable; 200 with database: "disconnected" on DB failure.

### API docs (GET /api-docs)

- **Does:** Serves Swagger UI for /api/v1.
- **Does not:** Require auth; enforce access control.
- **Preconditions:** None.
- **Failure behavior:** Standard server errors.

### Auth login (POST /api/v1/auth/login)

- **Does:** Accepts username and password; validates against DB; updates lastLoginAt; creates audit log; returns JWT and user (no password).
- **Does not:** Password reset; SSO/OAuth; email verification; rate limiting.
- **Preconditions:** Valid username and password in request body.
- **Failure behavior:** 400 missing credentials; 401 invalid credentials; 500 on server error.

### Auth me (GET /api/v1/auth/me) / Auth logout (POST /api/v1/auth/logout)

- **Does:** Me: returns current user. Logout: returns success (stateless JWT; client discards token).
- **Does not:** Invalidate token server-side; revoke sessions.
- **Preconditions:** Valid JWT in Authorization header.
- **Failure behavior:** 401 no/invalid token; 404 user not found (me); 500 on server error.

### Users CRUD (/api/v1/users/\*)

- **Does:** Create, list, get by id, update, delete users. Passwords hashed with bcrypt. superAdmin only.
- **Does not:** Self-delete; password reset; bulk import; OAuth.
- **Preconditions:** JWT with role superAdmin.
- **Failure behavior:** 400 validation; 401/403; 404; 409 username exists; 500.

### Categories and subcategories (/api/v1/categories/\*)

- **Does:** CRUD categories; create/delete subcategories; list by category. admin/superAdmin write; user+ read where exposed.
- **Does not:** Move categories; soft delete.
- **Preconditions:** JWT; role per route (admin/superAdmin for write).
- **Failure behavior:** 400/403/404/409/500.

### Products (/api/v1/products/\*)

- **Does:** CRUD products; bulk upload (CSV/Excel); product discounts; download template/export. admin/superAdmin write; user+ read.
- **Does not:** Soft delete; versioning; external file storage (uploads processed in-memory/multer).
- **Preconditions:** JWT; category/location/vendor exist where required.
- **Failure behavior:** 400/403/404/409/500; 408 timeout.

### Vendors (/api/v1/vendors/\*)

- **Does:** CRUD vendors. admin/superAdmin write; user+ read.
- **Does not:** Soft delete; merge vendors.
- **Preconditions:** JWT; role per route.
- **Failure behavior:** 400/403/404/409/500.

### Locations (/api/v1/locations/\*)

- **Does:** CRUD locations; location inventory view. superAdmin create/delete; user+ read/update where allowed.
- **Does not:** Soft delete; hierarchy.
- **Preconditions:** JWT; superAdmin for create/delete.
- **Failure behavior:** 400/403/404/409/500.

### Inventory (/api/v1/inventory/\*)

- **Does:** Get inventory by location/product; adjust quantity; set quantity. admin/superAdmin adjust/set; user+ read.
- **Does not:** Negative stock prevention (enforcement UNKNOWN); reservations.
- **Preconditions:** JWT; location and variation exist.
- **Failure behavior:** 400/403/404/500.

### Transfers (/api/v1/transfers/\*)

- **Does:** Create transfer; list; get by id; approve; start transit; complete; cancel; logs. admin/superAdmin for state changes; user+ read.
- **Does not:** Partial complete; auto-approve.
- **Preconditions:** JWT; from/to locations and items exist.
- **Failure behavior:** 400/403/404/500.

### Members (/api/v1/members/\*)

- **Does:** CRUD members; bulk upload; download template/export. admin/superAdmin write/bulk; user+ read.
- **Does not:** Soft delete; merge members.
- **Preconditions:** JWT; role per route.
- **Failure behavior:** 400/403/404/409/500; 408 timeout.

### Sales (/api/v1/sales/\*)

- **Does:** Create sale; list; get by id; payments; summaries; bulk upload; download. admin/superAdmin summary/bulk; user+ create/read.
- **Does not:** Refunds (implementation UNKNOWN); void sale.
- **Preconditions:** JWT; location, items, optional member.
- **Failure behavior:** 400/403/404/500; 408 timeout.

### Promos (/api/v1/promos/\*)

- **Does:** CRUD promo codes; list; get by id. admin/superAdmin write; user+ read.
- **Does not:** Schedule activation; A/B test.
- **Preconditions:** JWT; role per route.
- **Failure behavior:** 400/403/404/409/500.

### Audit logs (GET /api/v1/audit-logs)

- **Does:** List audit logs (paginated). superAdmin only.
- **Does not:** Delete or modify logs; export.
- **Preconditions:** JWT with role superAdmin.
- **Failure behavior:** 401/403/500.

### Error reports (POST/GET/PATCH /api/v1/error-reports)

- **Does:** Create report (user+); list and update status (superAdmin).
- **Does not:** Delete; assign; SLA.
- **Preconditions:** JWT; superAdmin for list/patch.
- **Failure behavior:** 400/401/403/404/500.

### Analytics (/api/v1/analytics/\*)

- **Does:** Overview (admin/superAdmin); sales-revenue, discount, payment-trends, location-comparison (user/admin/superAdmin); inventory-ops, customers-promos, member-cohort (admin/superAdmin). Some endpoints use cache middleware.
- **Does not:** Scheduled reports; email alerts; custom date ranges beyond implemented filters.
- **Preconditions:** JWT; role per endpoint (see analytics.router).
- **Failure behavior:** 401/403/500.

### Dashboard (/api/v1/dashboard/\*)

- **Does:** user-summary (user/admin/superAdmin); admin-summary (admin/superAdmin); superadmin-summary (superAdmin).
- **Does not:** Custom widgets; configurable layout.
- **Preconditions:** JWT; role per endpoint.
- **Failure behavior:** 401/403/500.

### Web UI (login, 401, workspace)

- **Does:** Login page; 401 page; workspace layout with (admin) and (superadmin) route segments for locations, members, product catalog/categories/discounts/promos, reports (analytics, customers, inventory, sales), sales, user-report, settings, transfers, vendors, admin-controls, error-reports, logs, users.
- **Does not:** Server-side role enforcement (relies on API); offline support.
- **Preconditions:** NEXT_PUBLIC_API_URL set in non-dev; auth state from API.
- **Failure behavior:** Build fails if NEXT_PUBLIC_API_URL missing in non-dev; runtime errors surface via UI/API.

## 3. Dependencies

### Internal (all features)

- Prisma (ORM); @repo/shared (types, utils); env config (env.ts); version (version.ts); logger (logger.ts); middlewares (auth, role, errorHandler, requestId).

### External

- **API:** PostgreSQL (DATABASE_URL). No other external APIs or cloud SDKs.
- **Web:** API via NEXT_PUBLIC_API_URL; @vercel/analytics optional (client-side).

### Required environment variables (summary)

- API: NODE_ENV, PORT, HOST, JWT_SECRET, DATABASE_URL; in non-dev: CORS_ORIGIN, API_PUBLIC_URL.
- Web: NEXT_PUBLIC_API_URL (required in non-dev).

## 4. Exclusions (Not Implemented)

- Password reset; SSO/OAuth; email verification.
- Rate limiting; API versioning beyond /api/v1.
- Background jobs; cron; webhooks.
- External file storage (e.g. S3) for uploads; uploads are in-memory (multer) then processed.
- Down migrations; automated DB backup; feature flags in use; kill switches.

**Disabled or incomplete features in code:** None identified. No placeholder "coming soon" features referenced in code.

**Excluded from this release:** Same as "Not implemented" above; no separate product exclusion list in repo.

## 5. Final Counts and Recommendation

| Metric                                    | Value               |
| ----------------------------------------- | ------------------- |
| Total features (API + Web distinct areas) | 22                  |
| Features enabled in production            | 22 (all)            |
| Features behind flags                     | 0                   |
| Features excluded (not implemented)       | Listed in Section 4 |

**Recommendation:** **SHIP** – All features are always on; no blocking issues identified in code. Ensure pre-deployment checklist (TESTING.md), required env vars, and CORS_ORIGIN are satisfied before release.
