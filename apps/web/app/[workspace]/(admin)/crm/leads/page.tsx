import { LeadsPage } from "@/features/crm";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { Feature } from "@repo/shared";

export default function CrmLeads() {
  return (
    <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <LeadsPage />
      </AuthGuard>
    </FeaturePageGuard>
  );
}
