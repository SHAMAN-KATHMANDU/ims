import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { ProductBulkUploadPage } from "@/features/products";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

export default function ProductBulkUploadRoute() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.BULK_UPLOAD_PRODUCTS}>
      <FeaturePageGuard feature={Feature.BULK_UPLOAD_PRODUCTS}>
        <AuthGuard
          roles={["admin", "superAdmin"]}
          unauthorizedPath={WORKSPACE_ROOT}
        >
          <ProductBulkUploadPage />
        </AuthGuard>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
