import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { SalesRevenuePage } from "@/features/analytics";

export const metadata = { title: "Sales & Revenue Analytics" };

/**
 * Sales & Revenue Analytics. User role sees own data only (backend enforces).
 */
export default function ReportsAnalyticsSalesPage() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <SalesRevenuePage />
    </AuthGuard>
  );
}
