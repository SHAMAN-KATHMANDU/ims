import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { AutomationBuilderPage } from "@/features/automation";
import { EnvFeaturePageGuard, EnvFeature } from "@/features/flags";

export const metadata = { title: "Automation" };

export default function AutomationPage() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.AUTOMATION}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <AutomationBuilderPage />
      </AuthGuard>
    </EnvFeaturePageGuard>
  );
}
