import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { EnvFeaturePageGuard, EnvFeature } from "@/features/flags";
import { TenantDomainsPage } from "@/features/sites";

export default function TenantDomainsRoute() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
      <AuthGuardWithWorkspace roles={["platformAdmin"]}>
        <TenantDomainsPage />
      </AuthGuardWithWorkspace>
    </EnvFeaturePageGuard>
  );
}
