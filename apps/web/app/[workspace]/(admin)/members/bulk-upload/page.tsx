import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { MembersBulkUploadPage } from "@/features/members";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

export default function MembersBulkUploadRoute() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.BULK_UPLOAD_PRODUCTS}>
      <FeaturePageGuard feature={Feature.BULK_UPLOAD_PRODUCTS}>
        <MembersBulkUploadPage />
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
