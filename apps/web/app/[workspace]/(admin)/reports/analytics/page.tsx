import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { AnalyticsIndexPage } from "@/features/analytics";

/**
 * Analytics index: lists report types (Sales & Revenue, Inventory & Operations, Customers & Promotions).
 */
export default function ReportsAnalyticsIndexPage() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <AnalyticsIndexPage />
    </AuthGuard>
  );
}
