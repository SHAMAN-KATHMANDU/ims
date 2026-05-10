import { AuthGuard } from "@/components/auth/auth-guard";
import { EnvFeature, EnvFeaturePageGuard } from "@/features/flags";
import { PermissionGate } from "@/features/permissions";
import { DomainsView } from "@/features/tenant-site/domains";

export const metadata = { title: "Domains — CMS" };

export default function DomainsPage() {
  return (
    <AuthGuard roles={["admin", "superAdmin"]}>
      <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
        <PermissionGate perm="WEBSITE.PAGES.VIEW">
          <DomainsView />
        </PermissionGate>
      </EnvFeaturePageGuard>
    </AuthGuard>
  );
}
