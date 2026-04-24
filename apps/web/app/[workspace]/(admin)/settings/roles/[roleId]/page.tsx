import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
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
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <RoleEditor roleId={id} />
    </AuthGuard>
  );
}
