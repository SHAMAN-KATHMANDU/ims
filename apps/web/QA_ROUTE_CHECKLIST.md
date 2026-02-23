# Full Route QA Checklist

## Auth/Public

- [x] `/`
- [x] `/system/login`
- [x] `/ruby/login`
- [x] `/doesnotexist/login`
- [x] `/401`

## Core Admin (ruby)

- [x] `/ruby`
- [x] `/ruby/sales`
- [ ] `/ruby/sales/bulk-upload`
- [ ] `/ruby/sales/user-report`
- [x] `/ruby/transfers`
- [ ] `/ruby/transfers/new`
- [x] `/ruby/members`
- [ ] `/ruby/members/new`
- [ ] `/ruby/members/bulk-upload`
- [ ] `/ruby/members/:id/edit`
- [x] `/ruby/product`
- [ ] `/ruby/product/new`
- [ ] `/ruby/product/:id/edit`
- [ ] `/ruby/product/catalog`
- [ ] `/ruby/product/categories`
- [ ] `/ruby/product/discounts`
- [ ] `/ruby/product/promos`
- [ ] `/ruby/product/bulk-upload`
- [x] `/ruby/vendors`
- [ ] `/ruby/vendors/new`
- [ ] `/ruby/vendors/:id/edit`
- [x] `/ruby/locations`
- [ ] `/ruby/locations/new`
- [ ] `/ruby/locations/:id/edit`
- [x] `/ruby/promos`
- [ ] `/ruby/promos/new`
- [ ] `/ruby/promos/:id/edit`
- [x] `/ruby/settings`
- [x] `/ruby/settings/usage`
- [x] `/ruby/trash`

## CRM + Reports (ruby)

- [x] `/ruby/crm`
- [ ] `/ruby/crm/companies`
- [x] `/ruby/crm/contacts`
- [ ] `/ruby/crm/contacts/new`
- [ ] `/ruby/crm/contacts/:id`
- [ ] `/ruby/crm/contacts/:id/edit`
- [x] `/ruby/crm/leads`
- [ ] `/ruby/crm/leads/new`
- [ ] `/ruby/crm/leads/:id`
- [ ] `/ruby/crm/leads/:id/edit`
- [x] `/ruby/crm/deals`
- [ ] `/ruby/crm/deals/new`
- [ ] `/ruby/crm/deals/:id`
- [ ] `/ruby/crm/deals/:id/edit`
- [x] `/ruby/crm/tasks`
- [ ] `/ruby/crm/tasks/new`
- [ ] `/ruby/crm/tasks/:id/edit`
- [x] `/ruby/crm/notifications`
- [x] `/ruby/reports/crm`
- [x] `/ruby/reports/analytics`
- [x] `/ruby/reports/analytics/sales`
- [x] `/ruby/reports/analytics/inventory`
- [x] `/ruby/reports/analytics/customers`
- [x] `/ruby/reports/analytics/trends`
- [x] `/ruby/reports/analytics/financial`

## Platform + Superadmin

- [x] `/system`
- [x] `/system/platform/tenants`
- [x] `/system/platform/tenants/new`
- [ ] `/system/platform/tenants/:id/edit`
- [x] `/system/platform/billing`
- [ ] `/system/platform/billing/tenants/:id`
- [x] `/admin/platform/billing`
- [x] `/ruby/users`
- [ ] `/ruby/users/new`
- [ ] `/ruby/users/:id/edit`
- [x] `/ruby/settings/logs`
- [x] `/ruby/settings/error-reports`
- [x] `/ruby/admin-controls`

## Coverage Notes

- Desktop coverage executed for all routes above.
- Login scenario coverage includes valid credentials, invalid password, and invalid workspace.
- Mobile QA: Create flows (New Sale, Add Member, New Promo, New Product, New Vendor, New Location, New Transfer, New User) use CSS `md:hidden`/`hidden md:block` so at viewport &lt;768px the link navigates to full-page `/new` routes instead of opening the drawer.
- Mobile overflow spec: `tests/mobile.spec.ts` validates no horizontal overflow at 320x568, 360x667, 390x844, 430x900 on public routes.
