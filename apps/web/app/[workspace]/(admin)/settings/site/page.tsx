import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EnvFeaturePageGuard, EnvFeature } from "@/features/flags";
import { TenantSitePage } from "@/features/tenant-site";

export const metadata = { title: "Website" };

/** Tenant website editor — admin/superAdmin only, gated by TENANT_WEBSITES flag. */
export default function TenantSiteRoute() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <TenantSitePage />
      </AuthGuard>
    </EnvFeaturePageGuard>
  );
}
