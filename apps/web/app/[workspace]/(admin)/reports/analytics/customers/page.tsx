import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { CustomersPromosPage } from "@/features/analytics";

export const metadata = { title: "Customers & Promotions Analytics" };

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
