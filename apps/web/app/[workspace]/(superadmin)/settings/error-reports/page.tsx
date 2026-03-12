import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { ErrorReportsPage } from "@/features/settings";

export const metadata = { title: "Error Reports" };

/** Error reports – platformAdmin only. */
export default function ErrorReportsRoute() {
  return (
    <AuthGuard roles={["platformAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <ErrorReportsPage />
    </AuthGuard>
  );
}
