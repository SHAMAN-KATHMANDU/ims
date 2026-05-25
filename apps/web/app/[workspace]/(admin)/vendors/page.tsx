import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { VendorPage } from "@/features/vendors";
import { PermissionGate } from "@/features/permissions";

export const metadata = { title: "Vendors" };

/** Vendors – admin/superAdmin only. */
export default function Vendors() {
  return (
    <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
      <PermissionGate perm="INVENTORY.VENDORS.VIEW">
        <VendorPage />
      </PermissionGate>
    </AuthGuardWithWorkspace>
  );
}
