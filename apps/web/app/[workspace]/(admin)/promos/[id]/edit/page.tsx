import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { EditPromoPage } from "@/features/promos";
import { Feature } from "@repo/shared";

export default function EditPromoRoute() {
  return (
    <FeaturePageGuard feature={Feature.PROMO_MANAGEMENT}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <EditPromoPage />
      </AuthGuard>
    </FeaturePageGuard>
  );
}
