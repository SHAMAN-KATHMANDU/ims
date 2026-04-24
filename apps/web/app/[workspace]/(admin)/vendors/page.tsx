import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { VendorPage } from "@/features/vendors";
import { PermissionGate } from "@/features/permissions";

export const metadata = { title: "Vendors" };

/** Vendors – admin/superAdmin only. */
export default function Vendors() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <PermissionGate perm="INVENTORY.VENDORS.VIEW">
        <VendorPage />
      </PermissionGate>
    </AuthGuard>
  );
}
