import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { PermissionGate } from "@/features/permissions";
import { BusinessProfilePage } from "@/features/tenants";

export const metadata = { title: "Business profile" };

/**
 * /settings/business-profile — tenant business profile editor.
 * Surfaced inside the SettingsShell so it shares the settings sub-nav.
 */
export default function SettingsBusinessProfilePage() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <PermissionGate perm="SETTINGS.TENANT.VIEW">
        <BusinessProfilePage />
      </PermissionGate>
    </AuthGuard>
  );
}
