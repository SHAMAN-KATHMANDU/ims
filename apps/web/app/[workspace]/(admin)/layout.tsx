import type React from "react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import AdminLoading from "./loading";

type Props = {
  children: React.ReactNode;
  modal: React.ReactNode;
  params: Promise<{ workspace: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return {
    title: `${workspace} | Admin`,
    description: `Admin workspace for ${workspace}`,
  };
}

/**
 * Admin app layout: requires auth. Dashboard and all tenant-scoped UI live under this.
 * Path: /[slug]/... (e.g. /ruby, /ruby/crm) — [slug] is the tenant slug from the URL.
 */
export default async function AdminLayout({ children, modal, params }: Props) {
  const { workspace } = await params;
  const slug = workspace?.trim() || "admin";
  return (
    <AuthGuard loginPath={`/${slug}/login`}>
      <DashboardLayout>
        <Suspense fallback={<AdminLoading />}>{children}</Suspense>
        {modal}
      </DashboardLayout>
    </AuthGuard>
  );
}
