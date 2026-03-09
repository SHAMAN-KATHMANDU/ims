import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { TrendsPage } from "@/features/analytics";
import { Feature } from "@repo/shared";

export const metadata = { title: "Trends & Patterns Analytics" };

/**
 * Trends & Patterns Analytics: MoM growth, seasonality, cohort retention, peak hours.
 */
export default function ReportsAnalyticsTrendsPage() {
  return (
    <FeaturePageGuard feature={Feature.ANALYTICS_ADVANCED}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <TrendsPage />
      </AuthGuard>
    </FeaturePageGuard>
  );
}
