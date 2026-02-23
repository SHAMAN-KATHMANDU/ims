import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { FinancialPage } from "@/views/analytics/FinancialPage";

type Props = {
  params: Promise<{ workspace: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspace } = await params;
  return { title: `Financial Analytics | ${workspace}` };
}

/**
 * Financial Analytics: gross profit, COGS breakdown, margin by category.
 */
export default function ReportsAnalyticsFinancialPage() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <FinancialPage />
    </AuthGuard>
  );
}
