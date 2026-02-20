import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { TenantsPage } from "@/views/tenants";

/** Platform tenants list – platformAdmin only. */
export default function PlatformTenantsRoute() {
  return (
    <AuthGuard roles={["platformAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <TenantsPage />
    </AuthGuard>
  );
}
