import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { PasswordResetRequestsPage } from "@/features/settings";

export const metadata = { title: "Password Reset Requests" };

/** Password reset requests – superAdmin only. */
export default function PasswordResetRequestsRoute() {
  return (
    <AuthGuard roles={["superAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <PasswordResetRequestsPage />
    </AuthGuard>
  );
}
