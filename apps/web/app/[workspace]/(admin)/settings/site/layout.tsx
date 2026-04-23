import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import {
  EnvFeaturePageGuard,
  TenantWebsitePageGuard,
  EnvFeature,
} from "@/features/flags";
import { SiteTabsNav } from "@/features/tenant-site";

/**
 * Layout for the tenant website editor. Stacks three guards so child pages
 * (Website / Pages / Blog / Design) inherit them without repetition:
 *
 *   1. EnvFeaturePageGuard    — platform-wide TENANT_WEBSITES env flag
 *   2. AuthGuard              — role check (admin / superAdmin only)
 *   3. TenantWebsitePageGuard — per-tenant websiteEnabled flag (platform
 *                               admin flips this per tenant; defaults off)
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
        <TenantWebsitePageGuard>
          <div className="space-y-6">
            <SiteTabsNav />
            {children}
          </div>
        </TenantWebsitePageGuard>
      </AuthGuard>
    </EnvFeaturePageGuard>
  );
}
