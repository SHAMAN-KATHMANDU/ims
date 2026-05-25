import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { NewPromoPage } from "@/features/promos";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

export default function NewPromoRoute() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.PROMOTIONS}>
      <FeaturePageGuard feature={Feature.PROMO_MANAGEMENT}>
        <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
          <NewPromoPage />
        </AuthGuardWithWorkspace>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
