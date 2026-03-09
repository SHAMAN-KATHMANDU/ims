import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { InventoryOpsPage } from "@/features/analytics";
import { Feature } from "@repo/shared";

export const metadata = { title: "Inventory & Operations Analytics" };

/**
 * Inventory & Operations Analytics – admin/superAdmin only.
 */
export default function ReportsAnalyticsInventory() {
  return (
    <FeaturePageGuard feature={Feature.ANALYTICS_ADVANCED}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <InventoryOpsPage />
      </AuthGuard>
    </FeaturePageGuard>
  );
}
