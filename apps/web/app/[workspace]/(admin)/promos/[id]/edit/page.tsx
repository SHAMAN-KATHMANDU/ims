import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EditPromoPage } from "@/views/promos/EditPromoPage";

export default function EditPromoRoute() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <EditPromoPage />
    </AuthGuard>
  );
}
