import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { PasswordResetRequestsPage } from "@/features/settings";

export const metadata = { title: "Password Reset Requests" };

/** Password reset requests – superAdmin only. */
export default function PasswordResetRequestsRoute() {
  return (
    <AuthGuardWithWorkspace roles={["superAdmin"]}>
      <PasswordResetRequestsPage />
    </AuthGuardWithWorkspace>
  );
}
