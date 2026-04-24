import type React from "react";
import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { OnboardingGuard } from "@/components/auth/onboarding-guard";
import { PlatformAdminRedirect } from "@/components/auth/platform-admin-redirect";
import { WorkspaceSlugGuard } from "@/components/auth/workspace-slug-guard";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export const metadata: Metadata = {
  title: { template: "%s | IMS", default: "Dashboard" },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
};

/**
 * Admin app layout: requires auth. Dashboard and all tenant-scoped UI live under this.
 * Path: /[slug]/... (e.g. /ruby, /ruby/crm) — [slug] is the tenant slug from the URL.
 * Redirects to onboarding when tenant has no default warehouse.
 */
export default async function AdminLayout({ children, params }: Props) {
  const { workspace } = await params;
  const slug = workspace?.trim() || "admin";
  return (
    <AuthGuard loginPath={`/${slug}/login`}>
      <WorkspaceSlugGuard>
        <PlatformAdminRedirect>
          <OnboardingGuard>
            <DashboardLayout>{children}</DashboardLayout>
          </OnboardingGuard>
        </PlatformAdminRedirect>
      </WorkspaceSlugGuard>
    </AuthGuard>
  );
}
