import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { PromoPage } from "@/views/promos";

/** Promo Codes (full management) – admin/superAdmin only. */
export default function Promos() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <PromoPage />
    </AuthGuard>
  );
}
