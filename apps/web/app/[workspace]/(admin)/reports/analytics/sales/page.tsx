import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { SalesRevenuePage } from "@/features/analytics";
import { Feature } from "@repo/shared";

export const metadata = { title: "Sales & Revenue Analytics" };

/**
 * Sales & Revenue Analytics. User role sees own data only (backend enforces).
 */
export default function ReportsAnalyticsSalesPage() {
  return (
    <FeaturePageGuard feature={Feature.ANALYTICS_ADVANCED}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <SalesRevenuePage />
      </AuthGuard>
    </FeaturePageGuard>
  );
}
