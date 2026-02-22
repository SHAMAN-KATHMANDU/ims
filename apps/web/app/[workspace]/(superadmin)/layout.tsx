import type React from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

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
    <AuthGuard
      loginPath={`/${slug}/login`}
      roles={["superAdmin", "platformAdmin"]}
    >
      <DashboardLayout>{children}</DashboardLayout>
    </AuthGuard>
  );
}
