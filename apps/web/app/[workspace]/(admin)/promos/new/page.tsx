import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { NewPromoPage } from "@/features/promos";
import { Feature } from "@repo/shared";

export default function NewPromoRoute() {
  return (
    <FeaturePageGuard feature={Feature.PROMO_MANAGEMENT}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <NewPromoPage />
      </AuthGuard>
    </FeaturePageGuard>
  );
}
