import { AuthGuard } from "@/components/auth/auth-guard";
import { EnvFeature, EnvFeaturePageGuard } from "@/features/flags";
import { PermissionGate } from "@/features/permissions";
import { SnippetsListPage } from "@/features/snippets";

export const metadata = { title: "Snippets" };

/**
 * Snippets list — Phase 5 reusable BlockNode[] sub-trees. Permissions
 * piggyback on WEBSITE.PAGES (snippets are page-content adjacent).
 */
export default function SnippetsRoute() {
  return (
    <AuthGuard roles={["admin", "superAdmin"]}>
      <EnvFeaturePageGuard envFeature={EnvFeature.TENANT_WEBSITES}>
        <PermissionGate perm="WEBSITE.PAGES.VIEW">
          <SnippetsListPage />
        </PermissionGate>
      </EnvFeaturePageGuard>
    </AuthGuard>
  );
}
