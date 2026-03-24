import { CrmDashboardPage } from "@/features/crm";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { Feature } from "@repo/shared";

export const metadata = { title: "CRM" };

export default function CrmDashboard() {
  return (
    <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <CrmDashboardPage />
      </AuthGuard>
    </FeaturePageGuard>
  );
}
