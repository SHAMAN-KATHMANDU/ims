import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { UserLogsPage } from "@/features/settings";
import { Feature } from "@repo/shared";

export const metadata = { title: "User Logs" };

/** User logs – superAdmin only, Enterprise plan. */
export default function UserLogsRoute() {
  return (
    <FeaturePageGuard feature={Feature.AUDIT_LOGS}>
      <AuthGuard roles={["superAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
        <UserLogsPage />
      </AuthGuard>
    </FeaturePageGuard>
  );
}
