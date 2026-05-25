import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { PermissionGate } from "@/features/permissions";
import { UsersPage } from "@/features/users";

export const metadata = { title: "Users" };

/** Users management – superAdmin only. */
export default function UsersManagementPage() {
  return (
    <AuthGuardWithWorkspace roles={["superAdmin"]}>
      <PermissionGate perm="SETTINGS.USERS.VIEW">
        <UsersPage />
      </PermissionGate>
    </AuthGuardWithWorkspace>
  );
}
