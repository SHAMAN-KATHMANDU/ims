import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { PlanLimitsPage } from "@/features/plan-limits";

/** Platform plan limits – platformAdmin only. */
export default function PlatformPlanLimitsRoute() {
  return (
    <AuthGuard roles={["platformAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <PlanLimitsPage />
    </AuthGuard>
  );
}
