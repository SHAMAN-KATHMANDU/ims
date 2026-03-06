import { FeaturePageGuard } from "@/features/flags";
import { SalesBulkUploadPage } from "@/features/sales";
import { Feature } from "@repo/shared";

export default function SalesBulkUploadRoute() {
  return (
    <FeaturePageGuard feature={Feature.BULK_UPLOAD_SALES}>
      <SalesBulkUploadPage />
    </FeaturePageGuard>
  );
}
