import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { PermissionGate } from "@/features/permissions";
import { UsersPage } from "@/features/users";

export const metadata = { title: "Users" };

/**
 * /settings/users — workspace user management.
 * Surfaced inside the SettingsShell so it shares the settings sub-nav.
 * Existing /users route under (superadmin) still works for direct links;
 * the settings nav points at this canonical location.
 */
export default function SettingsUsersPage() {
  return (
    <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
      <PermissionGate perm="SETTINGS.USERS.VIEW">
        <UsersPage />
      </PermissionGate>
    </AuthGuardWithWorkspace>
  );
}
