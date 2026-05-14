import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { ProductEditPage } from "@/features/products";

export default function EditProductRoute() {
  return (
    <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
      <ProductEditPage />
    </AuthGuardWithWorkspace>
  );
}
