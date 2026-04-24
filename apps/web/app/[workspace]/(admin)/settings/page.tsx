import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { PermissionGate } from "@/features/permissions";
import { SettingsPage } from "@/features/settings";

export const metadata = { title: "Settings" };

/** Workspace settings – admin/superAdmin only. */
export default function Settings() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <PermissionGate perm="SETTINGS.TENANT.VIEW">
        <SettingsPage />
      </PermissionGate>
    </AuthGuard>
  );
}
