import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { TrendsPage } from "@/views/analytics/TrendsPage";

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
