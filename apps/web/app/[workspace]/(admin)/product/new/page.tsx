import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { ProductNewPage } from "@/features/products";

export default function NewProductRoute() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <ProductNewPage />
    </AuthGuard>
  );
}
