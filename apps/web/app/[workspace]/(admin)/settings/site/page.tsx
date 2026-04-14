import { TenantSitePage } from "@/features/tenant-site";

export const metadata = { title: "Website" };

/**
 * Tenant website editor — branding, contact, template, publish.
 *
 * Feature flag + role guards are applied at the layout level; blog is a
 * sibling route at /settings/site/blog.
 */
export default function TenantSiteRoute() {
  return <TenantSitePage />;
}
