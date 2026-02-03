import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { VendorPage } from "@/views/vendors";

/** Vendors – admin/superAdmin only. */
export default function Vendors() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <VendorPage />
    </AuthGuard>
  );
}
