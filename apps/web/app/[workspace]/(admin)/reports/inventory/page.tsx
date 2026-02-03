import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { InventoryReportPage } from "@/views/reports/InventoryReportPage";

/**
 * Inventory report – admin/superAdmin only.
 */
export default function ReportsInventoryRoute() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <InventoryReportPage />
    </AuthGuard>
  );
}
