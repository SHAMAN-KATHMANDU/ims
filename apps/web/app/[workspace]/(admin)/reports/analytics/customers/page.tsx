import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { CustomersPromosPage } from "@/views/analytics/CustomersPromosPage";

/**
 * Customers, Products & Promotions Analytics – admin/superAdmin only.
 */
export default function ReportsAnalyticsCustomers() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <CustomersPromosPage />
    </AuthGuard>
  );
}
