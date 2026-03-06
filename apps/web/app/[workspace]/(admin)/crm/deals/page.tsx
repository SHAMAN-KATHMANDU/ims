import { FeaturePageGuard } from "@/features/flags";
import { DealsKanbanPage } from "@/features/crm";
import { Feature } from "@repo/shared";

export default function CrmDeals() {
  return (
    <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
      <DealsKanbanPage />
    </FeaturePageGuard>
  );
}
