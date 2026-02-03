import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { AnalyticsIndexPage } from "@/views/analytics/AnalyticsIndexPage";

/**
 * Analytics index: lists report types (Sales & Revenue, Inventory & Operations, Customers & Promotions).
 */
export default function ReportsAnalyticsIndexPage() {
  return (
    <AuthGuard
      roles={["user", "admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <AnalyticsIndexPage />
    </AuthGuard>
  );
}
