import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { PermissionGate } from "@/features/permissions";
import { RolesPage } from "@/features/settings/role-management";

export const metadata = { title: "Roles & permissions" };

/** Roles list — action-level gating at the component level. */
export default function Page() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <PermissionGate perm="SETTINGS.ROLES.VIEW">
        <RolesPage />
      </PermissionGate>
    </AuthGuard>
  );
}
