import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { TenantsPage } from "@/features/tenants";

export const metadata = { title: "Tenants" };

/** Platform tenants list – platformAdmin only. */
export default function PlatformTenantsRoute() {
  return (
    <AuthGuardWithWorkspace roles={["platformAdmin"]}>
      <TenantsPage />
    </AuthGuardWithWorkspace>
  );
}
