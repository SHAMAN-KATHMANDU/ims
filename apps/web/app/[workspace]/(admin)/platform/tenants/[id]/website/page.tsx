import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EnvFeaturePageGuard, EnvFeature } from "@/features/flags";
import { TenantWebsitePage } from "@/features/sites";

export default function TenantWebsiteRoute() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
      <AuthGuard roles={["platformAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
        <TenantWebsitePage />
      </AuthGuard>
    </EnvFeaturePageGuard>
  );
}
