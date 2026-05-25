import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { PermissionGate } from "@/features/permissions";
import { SettingsPage } from "@/features/settings";

export const metadata = { title: "Settings" };

/** Workspace settings – admin/superAdmin only. */
export default function Settings() {
  return (
    <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
      <PermissionGate perm="SETTINGS.TENANT.VIEW">
        <SettingsPage />
      </PermissionGate>
    </AuthGuardWithWorkspace>
  );
}
