import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";
import { CrmReportsPage } from "@/features/crm";

export const metadata = { title: "CRM Reports" };

/**
 * CRM Reports: deals won/lost, revenue, conversion rate, sales per user, leads by source.
 * Admin and superAdmin only. Gated by ANALYTICS_ADVANCED (Professional+).
 */
export default function ReportsCrmPage() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.CRM_REPORTS}>
      <FeaturePageGuard feature={Feature.ANALYTICS_ADVANCED}>
        <AuthGuard
          roles={["admin", "superAdmin"]}
          unauthorizedPath={WORKSPACE_ROOT}
        >
          <CrmReportsPage />
        </AuthGuard>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
