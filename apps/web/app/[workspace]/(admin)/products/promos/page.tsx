import { FeaturePageGuard } from "@/features/flags";
import { PromoPage } from "@/features/promos";
import { Feature } from "@repo/shared";

/**
 * Product Promo Codes – read-only list for all roles.
 * Under PRODUCTS in sidebar.
 */
export default function ProductPromosPage() {
  return (
    <FeaturePageGuard feature={Feature.PROMO_MANAGEMENT}>
      <PromoPage readOnly />
    </FeaturePageGuard>
  );
}
