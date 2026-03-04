import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { NewTenantPage } from "@/views/tenants/NewTenantPage";

export default function NewTenantRoute() {
  return (
    <AuthGuard roles={["platformAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <NewTenantPage />
    </AuthGuard>
  );
}
