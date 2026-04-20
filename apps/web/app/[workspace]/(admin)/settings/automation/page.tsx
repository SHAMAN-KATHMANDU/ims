import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { AutomationBuilderPage } from "@/features/automation";
import { EnvFeatureAnyPageGuard, EnvFeature } from "@/features/flags";

export const metadata = { title: "Automations" };

export default function AutomationPage() {
  return (
    <EnvFeatureAnyPageGuard
      envFeatures={[EnvFeature.AUTOMATION, EnvFeature.CRM_WORKFLOWS]}
    >
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <AutomationBuilderPage />
      </AuthGuard>
    </EnvFeatureAnyPageGuard>
  );
}
