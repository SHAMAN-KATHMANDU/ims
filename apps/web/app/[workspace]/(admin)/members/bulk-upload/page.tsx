import { FeaturePageGuard } from "@/features/flags";
import { MembersBulkUploadPage } from "@/features/members";
import { Feature } from "@repo/shared";

export default function MembersBulkUploadRoute() {
  return (
    <FeaturePageGuard feature={Feature.BULK_UPLOAD_PRODUCTS}>
      <MembersBulkUploadPage />
    </FeaturePageGuard>
  );
}
