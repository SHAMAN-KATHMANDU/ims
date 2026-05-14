import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { NewTenantPage } from "@/features/tenants";

export default function NewTenantRoute() {
  return (
    <AuthGuardWithWorkspace roles={["platformAdmin"]}>
      <NewTenantPage />
    </AuthGuardWithWorkspace>
  );
}
