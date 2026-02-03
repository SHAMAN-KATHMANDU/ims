import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { InventoryOpsPage } from "@/views/analytics/InventoryOpsPage";

/**
 * Inventory & Operations Analytics – admin/superAdmin only.
 */
export default function ReportsAnalyticsInventory() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <InventoryOpsPage />
    </AuthGuard>
  );
}
