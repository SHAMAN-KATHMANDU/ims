import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { NewPromoPage } from "@/views/promos/NewPromoPage";

export default function NewPromoRoute() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <NewPromoPage />
    </AuthGuard>
  );
}
