import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EnvFeaturePageGuard, EnvFeature } from "@/features/flags";
import { SiteTabsNav } from "@/features/tenant-site/components/SiteTabsNav";

/**
 * Layout for the tenant website editor. Renders a tab nav ("Website" and
 * "Blog") and delegates everything below to the child route. The feature
 * flag + role guard wrap every child page here so individual page.tsx files
 * don't need to repeat them.
 */
export default function TenantSiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <div className="space-y-6">
          <SiteTabsNav />
          {children}
        </div>
      </AuthGuard>
    </EnvFeaturePageGuard>
  );
}
