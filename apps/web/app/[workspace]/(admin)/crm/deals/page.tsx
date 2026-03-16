import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { DealsKanbanPage } from "@/features/crm";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

export default function CrmDeals() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.CRM_DEALS}>
      <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
        <DealsKanbanPage />
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
