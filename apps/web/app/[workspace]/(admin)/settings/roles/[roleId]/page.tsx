import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { PermissionGate } from "@/features/permissions";
import { RoleEditor } from "@/features/settings/role-management";

export const metadata = { title: "Edit role" };

export default async function Page({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  // The "new" pseudo-id routes to the create variant (empty bitset).
  const id = roleId === "new" ? undefined : roleId;

  return (
    <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
      <PermissionGate perm="SETTINGS.ROLES.VIEW">
        <RoleEditor roleId={id} />
      </PermissionGate>
    </AuthGuardWithWorkspace>
  );
}
