import type React from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { OnboardingGuard } from "@/components/auth/onboarding-guard";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

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
      <OnboardingGuard>
        <DashboardLayout>{children}</DashboardLayout>
      </OnboardingGuard>
    </AuthGuard>
  );
}
