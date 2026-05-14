import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { PermissionGate } from "@/features/permissions";
import { UserLogsPage } from "@/features/settings";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

export const metadata = { title: "User Logs" };

/** User logs – superAdmin only, Enterprise plan. */
export default function UserLogsRoute() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.AUDIT_LOGS}>
      <FeaturePageGuard feature={Feature.AUDIT_LOGS}>
        <AuthGuardWithWorkspace roles={["superAdmin"]}>
          <PermissionGate perm="SETTINGS.AUDIT.VIEW">
            <UserLogsPage />
          </PermissionGate>
        </AuthGuardWithWorkspace>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
