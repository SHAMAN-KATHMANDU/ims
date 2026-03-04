import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { VendorPage } from "@/features/vendors";

export const metadata = { title: "Vendors" };

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
