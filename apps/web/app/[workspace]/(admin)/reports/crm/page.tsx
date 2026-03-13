import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { Feature } from "@repo/shared";
import { CrmReportsPage } from "@/features/crm";

export const metadata = { title: "CRM Reports" };

/**
 * CRM Reports: deals won/lost, revenue, conversion rate, sales per user, leads by source.
 * Admin and superAdmin only. Gated by ANALYTICS_ADVANCED (Professional+).
 */
export default function ReportsCrmPage() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <FeaturePageGuard feature={Feature.ANALYTICS_ADVANCED}>
        <CrmReportsPage />
      </FeaturePageGuard>
    </AuthGuard>
  );
}
