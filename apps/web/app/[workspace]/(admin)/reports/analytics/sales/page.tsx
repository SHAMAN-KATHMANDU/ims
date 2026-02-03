import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { SalesRevenuePage } from "@/views/analytics/SalesRevenuePage";

/**
 * Sales & Revenue Analytics. User role sees own data only (backend enforces).
 */
export default function ReportsAnalyticsSalesPage() {
  return (
    <AuthGuard
      roles={["user", "admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <SalesRevenuePage />
    </AuthGuard>
  );
}
