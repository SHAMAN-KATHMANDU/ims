import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { InventoryOpsPage } from "@/features/analytics";

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
