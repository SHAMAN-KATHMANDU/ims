import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { EditLocationPage } from "@/views/locations/EditLocationPage";

export default function EditLocationRoute() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <EditLocationPage />
    </AuthGuard>
  );
}
