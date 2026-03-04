import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { UserLogsPage } from "@/features/settings";

export const metadata = { title: "User Logs" };

/** User logs – superAdmin only. */
export default function UserLogsRoute() {
  return (
    <AuthGuard roles={["superAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <UserLogsPage />
    </AuthGuard>
  );
}
