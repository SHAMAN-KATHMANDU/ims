import { EnvFeaturePageGuard, EnvFeature } from "@/features/flags";
import { DealsKanbanPage } from "@/features/crm/components/deals/DealsKanbanPage";

export default function CrmDeals() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.CRM_DEALS}>
      <DealsKanbanPage />
    </EnvFeaturePageGuard>
  );
}
