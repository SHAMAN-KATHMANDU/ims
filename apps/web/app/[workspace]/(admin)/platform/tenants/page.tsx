import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { TenantsPage } from "@/features/tenants";

/** Platform tenants list – platformAdmin only. */
export default function PlatformTenantsRoute() {
  return (
    <AuthGuard roles={["platformAdmin"]} unauthorizedPath={WORKSPACE_ROOT}>
      <TenantsPage />
    </AuthGuard>
  );
}
