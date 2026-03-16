import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { PromoPage } from "@/features/promos";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

/**
 * Product Promo Codes – read-only list for all roles.
 * Under PRODUCTS in sidebar.
 */
export default function ProductPromosPage() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.PROMO_CODES}>
      <FeaturePageGuard feature={Feature.PROMO_MANAGEMENT}>
        <PromoPage readOnly />
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
