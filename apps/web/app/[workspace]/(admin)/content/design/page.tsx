import { AuthGuard } from "@/components/auth/auth-guard";
import { EnvFeature, EnvFeaturePageGuard } from "@/features/flags";
import { PermissionGate } from "@/features/permissions";
import { DesignThemeView } from "@/features/tenant-site/design";

export const metadata = { title: "Design — CMS" };

export default function DesignPage() {
  return (
    <AuthGuard roles={["admin", "superAdmin"]}>
      <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
        <PermissionGate perm="WEBSITE.PAGES.VIEW">
          <DesignThemeView />
        </PermissionGate>
      </EnvFeaturePageGuard>
    </AuthGuard>
  );
}
