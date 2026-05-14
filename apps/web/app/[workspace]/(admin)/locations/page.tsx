import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { LocationsPage } from "@/features/locations";
import { PermissionGate } from "@/features/permissions";

export const metadata = { title: "Locations" };

/** Locations – admin/superAdmin only. */
export default function Locations() {
  return (
    <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
      <PermissionGate perm="INVENTORY.LOCATIONS.VIEW">
        <LocationsPage />
      </PermissionGate>
    </AuthGuardWithWorkspace>
  );
}
