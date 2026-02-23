# Frontend UI/UX Optimization Baseline

This document is the execution baseline for the phase-by-phase UI/UX hardening effort.

## 1) Route Inventory by Module

### Auth and Global

- `/`
- `/login`
- `/401`
- `/:workspace/login`

### Dashboard and Settings

- `/:workspace`
- `/:workspace/settings`
- `/:workspace/settings/usage`
- `/:workspace/trash`

### Sales

- `/:workspace/sales`
- `/:workspace/sales/new`
- `/:workspace/sales/bulk-upload`
- `/:workspace/sales/user-report`

### Products and Inventory

- `/:workspace/product`
- `/:workspace/product/new`
- `/:workspace/product/:id/edit`
- `/:workspace/product/catalog`
- `/:workspace/product/categories`
- `/:workspace/product/discounts`
- `/:workspace/product/promos`
- `/:workspace/product/bulk-upload`
- `/:workspace/locations`
- `/:workspace/locations/new`
- `/:workspace/locations/:id/edit`
- `/:workspace/vendors`
- `/:workspace/vendors/new`
- `/:workspace/vendors/:id/edit`
- `/:workspace/transfers`
- `/:workspace/transfers/new`

### Members and Promos

- `/:workspace/members`
- `/:workspace/members/new`
- `/:workspace/members/:id/edit`
- `/:workspace/members/bulk-upload`
- `/:workspace/promos`
- `/:workspace/promos/new`
- `/:workspace/promos/:id/edit`

### CRM

- `/:workspace/crm`
- `/:workspace/crm/companies`
- `/:workspace/crm/contacts`
- `/:workspace/crm/contacts/new`
- `/:workspace/crm/contacts/:id`
- `/:workspace/crm/contacts/:id/edit`
- `/:workspace/crm/leads`
- `/:workspace/crm/leads/new`
- `/:workspace/crm/leads/:id`
- `/:workspace/crm/leads/:id/edit`
- `/:workspace/crm/deals`
- `/:workspace/crm/deals/new`
- `/:workspace/crm/deals/:id`
- `/:workspace/crm/deals/:id/edit`
- `/:workspace/crm/tasks`
- `/:workspace/crm/tasks/new`
- `/:workspace/crm/tasks/:id/edit`
- `/:workspace/crm/notifications`
- `/:workspace/reports/crm`
- `/:workspace/crm/reports`

### Analytics

- `/:workspace/reports/analytics`
- `/:workspace/reports/analytics/sales`
- `/:workspace/reports/analytics/inventory`
- `/:workspace/reports/analytics/customers`
- `/:workspace/reports/analytics/trends`
- `/:workspace/reports/analytics/financial`

### Platform and Superadmin

- `/:workspace/platform/tenants`
- `/:workspace/platform/tenants/new`
- `/:workspace/platform/tenants/:id/edit`
- `/:workspace/platform/billing`
- `/:workspace/platform/billing/tenants/:id`
- `/:workspace/users`
- `/:workspace/users/new`
- `/:workspace/users/:id/edit`
- `/:workspace/settings/logs`
- `/:workspace/settings/error-reports`
- `/:workspace/admin-controls`

## 2) Viewport QA Matrix

Target widths:

- `320`, `360`, `390`, `430`, `768`, `1024`, `1280`

Pass criteria for each route:

1. No root horizontal overflow.
2. No clipped/hidden primary actions.
3. Inputs/labels are readable without overlap.
4. Drawer/modal content scrolls vertically within viewport.
5. Exactly one horizontal scroll region only when intentional (kanban/data table).

## 3) Known Overflow Risk Patterns (Initial Audit)

High-risk shared patterns:

- `whitespace-nowrap` in table header/cell defaults.
- Fixed widths in controls: `w-[200px]`, `w-[220px]`, `min-w-[180px]`.
- `w-fit` in `SelectTrigger`/`TabsList` causing crowding.
- Hard multi-column grids with no mobile fallback (`grid-cols-2`, `grid-cols-3`).

High-risk screens:

- Sales creation and transfer forms.
- Billing/platform table-heavy views.
- CRM kanban boards and dense filter bars.
- Settings logs/error-report tables.

## 4) Dev Diagnostic Utility

Overflow diagnostics are enabled in development with:

```bash
NEXT_PUBLIC_DEBUG_OVERFLOW=true
```

When enabled, the app logs elements exceeding viewport width in browser console.
