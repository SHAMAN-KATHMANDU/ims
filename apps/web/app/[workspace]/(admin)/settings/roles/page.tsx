import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { PermissionGate } from "@/features/permissions";
import { RolesPage } from "@/features/settings/role-management";

export const metadata = { title: "Roles & permissions" };

/** Roles list — action-level gating at the component level. */
export default function Page() {
  return (
    <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
      <PermissionGate perm="SETTINGS.ROLES.VIEW">
        <RolesPage />
      </PermissionGate>
    </AuthGuardWithWorkspace>
  );
}
