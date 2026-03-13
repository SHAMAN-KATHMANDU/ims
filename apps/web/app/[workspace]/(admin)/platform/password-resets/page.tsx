import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { PlatformResetRequestsPage } from "@/features/tenants/components/PlatformResetRequestsPage";

export const metadata = { title: "Password Reset Requests" };

/** Platform password reset requests – platformAdmin only. */
export default function PlatformPasswordResetsRoute() {
  return (
    <AuthGuard roles={["platformAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <PlatformResetRequestsPage />
    </AuthGuard>
  );
}
