import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EditTenantPage } from "@/features/tenants";

export default function EditTenantRoute() {
  return (
    <AuthGuard roles={["platformAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <EditTenantPage />
    </AuthGuard>
  );
}
