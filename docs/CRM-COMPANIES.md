# CRM Companies

## How to Add Companies

Companies can be added in two ways:

### 1. Via Companies Page (default)

- Navigate to **CRM → Companies** in the sidebar
- Click **Add Company**
- Fill in Name (required), Website, Address, Phone
- Click **Create**

### 2. Via Lead Conversion

- When converting a lead that has a `companyName`, the system automatically creates a Company if it doesn't already exist

---

## Hiding Companies from Sidebar

If you don't want Companies in the sidebar but still need to manage them:

1. Open `apps/web/components/layout/sidebar.tsx`
2. Remove the Companies nav item from the CRM section:

```tsx
// Remove this block:
{
  path: "crm/companies",
  label: "Companies",
  icon: Factory,
  roles: ["user", "admin", "superAdmin"],
},
```

3. Companies remain accessible at: `/[workspace]/crm/companies` (e.g. `/admin/crm/companies`)

---

## Default: No Company

- Contact and Deal forms default to **"None"** for Company
- Companies are optional; most contacts/deals can exist without a company
