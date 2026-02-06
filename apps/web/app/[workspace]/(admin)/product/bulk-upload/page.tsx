import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { ProductBulkUploadPage } from "@/views/products/ProductBulkUploadPage";

export default function ProductBulkUploadRoute() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <ProductBulkUploadPage />
    </AuthGuard>
  );
}
