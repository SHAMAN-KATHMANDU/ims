import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { UsersPage } from "@/views/users";

/** Users management – superAdmin only. */
export default function UsersManagementPage() {
  return (
    <AuthGuard roles={["superAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <UsersPage />
    </AuthGuard>
  );
}
