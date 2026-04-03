import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { AutomationsHubPage } from "@/features/automation";
import { EnvFeaturePageGuard, EnvFeature } from "@/features/flags";

export const metadata = { title: "Automations overview" };

/** Entry point: explains event automations vs deal pipeline rules (no API calls). */
export default function AutomationsOverviewPage() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.SETTINGS}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <AutomationsHubPage />
      </AuthGuard>
    </EnvFeaturePageGuard>
  );
}
