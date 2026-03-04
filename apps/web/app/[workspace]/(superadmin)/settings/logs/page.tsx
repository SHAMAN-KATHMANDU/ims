import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { UserLogsPage } from "@/views/settings/UserLogsPage";

/** User logs – superAdmin only. */
export default function UserLogsRoute() {
  return (
    <AuthGuard roles={["superAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <UserLogsPage />
    </AuthGuard>
  );
}
