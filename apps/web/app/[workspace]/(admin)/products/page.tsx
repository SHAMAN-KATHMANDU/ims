import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { ProductPage } from "@/features/products";
import { PermissionGate } from "@/features/permissions";

export const metadata = { title: "Products" };

/** Products (inventory) – admin/superAdmin only. */
export default function Product() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <PermissionGate perm="INVENTORY.PRODUCTS.VIEW">
        <ProductPage />
      </PermissionGate>
    </AuthGuard>
  );
}
