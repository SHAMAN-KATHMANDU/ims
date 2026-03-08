import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { ProductBulkUploadPage } from "@/features/products";
import { Feature } from "@repo/shared";

export default function ProductBulkUploadRoute() {
  return (
    <FeaturePageGuard feature={Feature.BULK_UPLOAD_PRODUCTS}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <ProductBulkUploadPage />
      </AuthGuard>
    </FeaturePageGuard>
  );
}
