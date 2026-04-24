import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { PermissionGate } from "@/features/permissions";
import { UsersPage } from "@/features/users";

export const metadata = { title: "Users" };

/** Users management – superAdmin only. */
export default function UsersManagementPage() {
  return (
    <AuthGuard roles={["superAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <PermissionGate perm="SETTINGS.USERS.VIEW">
        <UsersPage />
      </PermissionGate>
    </AuthGuard>
  );
}
