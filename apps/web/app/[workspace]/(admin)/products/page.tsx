import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { ProductPage } from "@/features/products";
import { PermissionGate } from "@/features/permissions";

export const metadata = { title: "Products" };

/** Products (inventory) – admin/superAdmin only. */
export default function Product() {
  return (
    <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
      <PermissionGate perm="INVENTORY.PRODUCTS.VIEW">
        <ProductPage />
      </PermissionGate>
    </AuthGuardWithWorkspace>
  );
}
