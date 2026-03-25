import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { DealsKanbanPage } from "@/features/crm";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

export default function CrmDeals() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.CRM_DEALS}>
      <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
        <AuthGuard
          roles={["admin", "superAdmin"]}
          unauthorizedPath={WORKSPACE_ROOT}
        >
          <DealsKanbanPage />
        </AuthGuard>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
