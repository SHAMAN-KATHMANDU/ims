import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { ProductEditPage } from "@/views/products/ProductEditPage";

export default function EditProductRoute() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <ProductEditPage />
    </AuthGuard>
  );
}
