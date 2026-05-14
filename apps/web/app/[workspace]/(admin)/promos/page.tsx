import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { PromoPage } from "@/features/promos";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";
import { PermissionGate } from "@/features/permissions";

export const metadata = { title: "Promo Codes" };

/** Promo Codes (full management) – admin/superAdmin only. */
export default function Promos() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.PROMOTIONS}>
      <FeaturePageGuard feature={Feature.PROMO_MANAGEMENT}>
        <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
          <PermissionGate perm="INVENTORY.PROMOS.VIEW">
            <PromoPage />
          </PermissionGate>
        </AuthGuardWithWorkspace>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
