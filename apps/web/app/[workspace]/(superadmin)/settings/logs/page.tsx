import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { UserLogsPage } from "@/features/settings";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

export const metadata = { title: "User Logs" };

/** User logs – superAdmin only, Enterprise plan. */
export default function UserLogsRoute() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.AUDIT_LOGS}>
      <FeaturePageGuard feature={Feature.AUDIT_LOGS}>
        <AuthGuard roles={["superAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
          <UserLogsPage />
        </AuthGuard>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
