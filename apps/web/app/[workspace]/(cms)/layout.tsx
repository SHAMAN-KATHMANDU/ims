import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { OnboardingGuard } from "@/components/auth/onboarding-guard";
import { PlatformAdminRedirect } from "@/components/auth/platform-admin-redirect";
import { WorkspaceSlugGuard } from "@/components/auth/workspace-slug-guard";
import { EnvFeature, EnvFeaturePageGuard } from "@/features/flags";
import { PermissionGate } from "@/features/permissions";
import { ContentShell } from "@/features/cms-shell";

export const metadata: Metadata = {
  title: { template: "%s | Site CMS", default: "Site CMS" },
};

type Props = {
  children: ReactNode;
  params: Promise<{ workspace: string }>;
};

/**
 * Site CMS layout — parallel to `(admin)` and `(platform)`. Mounts only its
 * own `ContentShell` so the tenant admin's CRM/Sales/Inventory rail does not
 * render alongside it. Mirrors the `(platform)` shell-isolation pattern.
 *
 * Routes: /[workspace]/site/* (route group `(cms)` is invisible in the URL).
 */
export default async function CmsLayout({ children, params }: Props) {
  const { workspace } = await params;
  const slug = workspace?.trim() || "admin";
  return (
    <AuthGuard loginPath={`/${slug}/login`} roles={["admin", "superAdmin"]}>
      <WorkspaceSlugGuard>
        <PlatformAdminRedirect>
          <OnboardingGuard>
            <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
              <PermissionGate perm="WEBSITE.PAGES.VIEW">
                <ContentShell>{children}</ContentShell>
              </PermissionGate>
            </EnvFeaturePageGuard>
          </OnboardingGuard>
        </PlatformAdminRedirect>
      </WorkspaceSlugGuard>
    </AuthGuard>
  );
}
