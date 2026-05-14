import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { EditTenantPage } from "@/features/tenants";

export default function EditTenantRoute() {
  return (
    <AuthGuardWithWorkspace roles={["platformAdmin"]}>
      <EditTenantPage />
    </AuthGuardWithWorkspace>
  );
}
