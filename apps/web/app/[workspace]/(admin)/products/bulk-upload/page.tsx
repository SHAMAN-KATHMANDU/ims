import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { ProductBulkUploadPage } from "@/features/products";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

export default function ProductBulkUploadRoute() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.BULK_UPLOAD_PRODUCTS}>
      <FeaturePageGuard feature={Feature.BULK_UPLOAD_PRODUCTS}>
        <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
          <ProductBulkUploadPage />
        </AuthGuardWithWorkspace>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
