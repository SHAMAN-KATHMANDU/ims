import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { PlanLimitsPage } from "@/features/plan-limits";

export const metadata = { title: "Plan limits" };

/** Platform plan limits – platformAdmin only. */
export default function PlatformPlanLimitsRoute() {
  return (
    <AuthGuardWithWorkspace roles={["platformAdmin"]}>
      <PlanLimitsPage />
    </AuthGuardWithWorkspace>
  );
}
