import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { PlatformResetRequestsPage } from "@/features/tenants";

export const metadata = { title: "Password Reset Requests" };

/** Platform password reset requests – platformAdmin only. */
export default function PlatformPasswordResetsRoute() {
  return (
    <AuthGuardWithWorkspace roles={["platformAdmin"]}>
      <PlatformResetRequestsPage />
    </AuthGuardWithWorkspace>
  );
}
