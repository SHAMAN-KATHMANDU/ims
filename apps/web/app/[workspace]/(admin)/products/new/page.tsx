import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { ProductNewPage } from "@/features/products";

export default function NewProductRoute() {
  return (
    <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
      <ProductNewPage />
    </AuthGuardWithWorkspace>
  );
}
