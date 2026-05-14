import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { EnvFeaturePageGuard, EnvFeature } from "@/features/flags";
import { TenantWebsitePage } from "@/features/sites";

export default function TenantWebsiteRoute() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
      <AuthGuardWithWorkspace roles={["platformAdmin"]}>
        <TenantWebsitePage />
      </AuthGuardWithWorkspace>
    </EnvFeaturePageGuard>
  );
}
