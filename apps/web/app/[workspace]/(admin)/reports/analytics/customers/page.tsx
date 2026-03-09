import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { CustomersPromosPage } from "@/features/analytics";
import { Feature } from "@repo/shared";

export const metadata = { title: "Customers & Promotions Analytics" };

/**
 * Customers, Products & Promotions Analytics – admin/superAdmin only.
 */
export default function ReportsAnalyticsCustomers() {
  return (
    <FeaturePageGuard feature={Feature.ANALYTICS_ADVANCED}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <CustomersPromosPage />
      </AuthGuard>
    </FeaturePageGuard>
  );
}
