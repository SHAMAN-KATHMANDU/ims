import { AuthGuard } from "@/components/auth/auth-guard";
import { EnvFeature, EnvFeaturePageGuard } from "@/features/flags";
import { PermissionGate } from "@/features/permissions";
import { BlocksLibraryView } from "@/features/tenant-site/blocks-library";

export const metadata = { title: "Blocks Library — CMS" };

export default function BlocksPage() {
  return (
    <AuthGuard roles={["admin", "superAdmin"]}>
      <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
        <PermissionGate perm="WEBSITE.PAGES.VIEW">
          <BlocksLibraryView />
        </PermissionGate>
      </EnvFeaturePageGuard>
    </AuthGuard>
  );
}
