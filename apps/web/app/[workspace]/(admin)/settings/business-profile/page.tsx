import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { PermissionGate } from "@/features/permissions";
import { BusinessProfilePage } from "@/features/tenants";

export const metadata = { title: "Business profile" };

/**
 * /settings/business-profile — tenant business profile editor.
 * Surfaced inside the SettingsShell so it shares the settings sub-nav.
 */
export default function SettingsBusinessProfilePage() {
  return (
    <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
      <PermissionGate perm="SETTINGS.TENANT.VIEW">
        <BusinessProfilePage />
      </PermissionGate>
    </AuthGuardWithWorkspace>
  );
}
