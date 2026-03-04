import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { SalesRevenuePage } from "@/features/analytics";

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
