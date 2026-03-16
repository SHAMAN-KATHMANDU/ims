import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { NewPromoPage } from "@/features/promos";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

export default function NewPromoRoute() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.PROMOTIONS}>
      <FeaturePageGuard feature={Feature.PROMO_MANAGEMENT}>
        <AuthGuard
          roles={["admin", "superAdmin"]}
          unauthorizedPath={WORKSPACE_ROOT}
        >
          <NewPromoPage />
        </AuthGuard>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
