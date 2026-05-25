import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { PermissionGate } from "@/features/permissions";
import { ErrorReportsPage } from "@/features/settings";

export const metadata = { title: "Error Reports" };

/** Error reports – platformAdmin only. */
export default function ErrorReportsRoute() {
  return (
    <AuthGuardWithWorkspace roles={["platformAdmin"]}>
      <PermissionGate perm="SETTINGS.ERROR_REPORTS.VIEW">
        <ErrorReportsPage />
      </PermissionGate>
    </AuthGuardWithWorkspace>
  );
}
