import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FinancialPage } from "@/features/analytics";

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
