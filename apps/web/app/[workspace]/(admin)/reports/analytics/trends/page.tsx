import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { TrendsPage } from "@/features/analytics";

/**
 * Trends & Patterns Analytics: MoM growth, seasonality, cohort retention, peak hours.
 */
export default function ReportsAnalyticsTrendsPage() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <TrendsPage />
    </AuthGuard>
  );
}
