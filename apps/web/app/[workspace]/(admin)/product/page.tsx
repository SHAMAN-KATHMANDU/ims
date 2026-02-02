import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { ProductPage } from "@/views/products";

/** Products (inventory) – admin/superAdmin only. */
export default function Product() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <ProductPage />
    </AuthGuard>
  );
}
