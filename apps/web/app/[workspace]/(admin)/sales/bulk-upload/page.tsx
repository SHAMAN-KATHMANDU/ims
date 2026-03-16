import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { SalesBulkUploadPage } from "@/features/sales";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

export default function SalesBulkUploadRoute() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.BULK_UPLOAD_SALES}>
      <FeaturePageGuard feature={Feature.BULK_UPLOAD_SALES}>
        <SalesBulkUploadPage />
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
