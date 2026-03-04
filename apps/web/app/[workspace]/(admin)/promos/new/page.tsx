import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { NewPromoPage } from "@/features/promos";

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
