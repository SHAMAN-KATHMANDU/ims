import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { getLoginPath, getWorkspaceRoot } from "@/constants/routes";
import {
  EnvFeaturePageGuard,
  TenantWebsitePageGuard,
  EnvFeature,
} from "@/features/flags";
import { SiteTabsNav } from "@/features/tenant-site";

type Props = {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
};

/**
 * Layout for the tenant website editor. Stacks three guards so child pages
 * (Website / Pages / Blog / Design) inherit them without repetition:
 *
 *   1. EnvFeaturePageGuard    — platform-wide TENANT_WEBSITES env flag
 *   2. AuthGuard              — role check (admin / superAdmin only)
 *   3. TenantWebsitePageGuard — per-tenant websiteEnabled flag (platform
 *                               admin flips this per tenant; defaults off)
 */
export default async function TenantSiteLayout({ children, params }: Props) {
  const { workspace } = await params;
  const slug = workspace?.trim() || "admin";
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        loginPath={getLoginPath(slug)}
        unauthorizedPath={getWorkspaceRoot(slug)}
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
