import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { PermissionGate } from "@/features/permissions";
import { FacebookIntegrationPage } from "@/features/meta-integration";

export const metadata = { title: "Facebook / Meta" };

/**
 * /settings/integrations/facebook — Meta integration settings.
 * Surfaces in the SettingsLayout side-nav under "Facebook / Meta".
 * Gated on SETTINGS.META.VIEW permission.
 */
export default function FacebookIntegrationSettingsPage() {
  return (
    <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
      <PermissionGate perm="SETTINGS.META.VIEW">
        <FacebookIntegrationPage />
      </PermissionGate>
    </AuthGuardWithWorkspace>
  );
}
