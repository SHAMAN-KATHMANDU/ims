import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { ErrorReportsPage } from "@/features/settings";

/** Error reports – superAdmin only. */
export default function ErrorReportsRoute() {
  return (
    <AuthGuard roles={["superAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <ErrorReportsPage />
    </AuthGuard>
  );
}
