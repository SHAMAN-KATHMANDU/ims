import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { AnalyticsIndexPage } from "@/features/analytics";
import { Feature } from "@repo/shared";

export const metadata = { title: "Analytics" };

/**
 * Analytics index: lists report types (Sales & Revenue, Inventory & Operations, Customers & Promotions).
 */
export default function ReportsAnalyticsIndexPage() {
  return (
    <FeaturePageGuard feature={Feature.ANALYTICS_ADVANCED}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <AnalyticsIndexPage />
      </AuthGuard>
    </FeaturePageGuard>
  );
}
