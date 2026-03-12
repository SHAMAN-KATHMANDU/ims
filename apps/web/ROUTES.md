# Route & Access Spec

All routes live under `/[workspace]` (e.g. `/admin`). Route groups `(admin)` and `(superadmin)` do **not** change the URL; they only organize files.

## Path → Roles (single source of truth)

| Path                          | Allowed roles           | Route file                                     | Notes                          |
| ----------------------------- | ----------------------- | ---------------------------------------------- | ------------------------------ |
| `""` (dashboard)              | user, admin, superAdmin | `(admin)/page.tsx`                             |                                |
| `sales`                       | user, admin, superAdmin | `(admin)/sales/page.tsx`                       |                                |
| `sales/user-report`           | user, admin, superAdmin | `(admin)/sales/user-report/page.tsx`           |                                |
| `members`                     | user, admin, superAdmin | `(admin)/members/page.tsx`                     |                                |
| `products`                    | admin, superAdmin       | `(admin)/products/page.tsx`                    | Products (inventory); guarded  |
| `products/catalog`            | user, admin, superAdmin | `(admin)/products/catalog/page.tsx`            | Read-only catalog              |
| `products/categories`         | user, admin, superAdmin | `(admin)/products/categories/page.tsx`         |                                |
| `products/discounts`          | user, admin, superAdmin | `(admin)/products/discounts/page.tsx`          |                                |
| `products/promos`             | user, admin, superAdmin | `(admin)/products/promos/page.tsx`             | Read-only promo codes          |
| `promos`                      | admin, superAdmin       | `(admin)/promos/page.tsx`                      | Full promo management; guarded |
| `transfers`                   | user, admin, superAdmin | `(admin)/transfers/page.tsx`                   | Create + list by role in view  |
| `locations`                   | admin, superAdmin       | `(admin)/locations/page.tsx`                   | Guarded                        |
| `vendors`                     | admin, superAdmin       | `(admin)/vendors/page.tsx`                     | Guarded                        |
| `reports/analytics/sales`     | admin, superAdmin       | `(admin)/reports/analytics/sales/page.tsx`     | Sales & Revenue; guarded       |
| `reports/analytics/inventory` | admin, superAdmin       | `(admin)/reports/analytics/inventory/page.tsx` | Inventory & Ops; guarded       |
| `reports/analytics/customers` | admin, superAdmin       | `(admin)/reports/analytics/customers/page.tsx` | Customers & Promos; guarded    |
| `reports/analytics/trends`    | admin, superAdmin       | `(admin)/reports/analytics/trends/page.tsx`    | Trends; guarded                |
| `reports/analytics/financial` | admin, superAdmin       | `(admin)/reports/analytics/financial/page.tsx` | Financial; guarded             |
| `reports/crm`                 | admin, superAdmin       | `(admin)/reports/crm/page.tsx`                 | CRM reports; guarded           |
| `crm/reports`                 | —                       | `(admin)/crm/reports/page.tsx`                 | Redirects to reports/crm       |
| `settings`                    | admin, superAdmin       | `(admin)/settings/page.tsx`                    | Workspace settings; guarded    |
| `users`                       | superAdmin              | `(superadmin)/users/page.tsx`                  | Guarded                        |
| `settings/logs`               | superAdmin              | `(superadmin)/settings/logs/page.tsx`          | User logs; guarded             |
| `settings/error-reports`      | platformAdmin           | `(superadmin)/settings/error-reports/page.tsx` | Guarded                        |
| `admin-controls`              | superAdmin              | `(superadmin)/admin-controls/page.tsx`         | System; guarded                |

## Rules

1. **One route per URL** – No duplicate file trees that resolve to the same path (e.g. only one `product/catalog`).
2. **Guarded routes** – Pages that are admin-only or superAdmin-only must wrap content in `<AuthGuard roles={[...]} unauthorizedPath="/admin" />`.
3. **Sidebar** – `sidebar.tsx` shows/hides links by role; same path may appear in multiple nav sections (e.g. "transfers" under PRODUCTS and INVENTORY).
