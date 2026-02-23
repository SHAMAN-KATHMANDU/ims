import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { AnalyticsIndexPage } from "@/views/analytics/AnalyticsIndexPage";

type Props = {
  params: Promise<{ workspace: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Analytics | ${workspace}` };
}

/**
 * Analytics index: lists report types (Sales & Revenue, Inventory & Operations, Customers & Promotions).
 */
export default function ReportsAnalyticsIndexPage() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <AnalyticsIndexPage />
    </AuthGuard>
  );
}
