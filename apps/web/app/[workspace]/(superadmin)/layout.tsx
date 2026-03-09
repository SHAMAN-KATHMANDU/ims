import type React from "react";
import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
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
 * Superadmin app layout: requires auth. Gives settings/logs, settings/error-reports,
 * users, admin-controls the same sidebar and top bar as admin routes.
 * Path: /[slug]/... (e.g. /admin/settings/logs)
 */
export default async function SuperadminLayout({ children, params }: Props) {
  const { workspace } = await params;
  const slug = workspace?.trim() || "admin";
  return (
    <AuthGuard loginPath={`/${slug}/login`}>
      <WorkspaceSlugGuard>
        <DashboardLayout>{children}</DashboardLayout>
      </WorkspaceSlugGuard>
    </AuthGuard>
  );
}
