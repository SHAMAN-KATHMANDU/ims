import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { LocationsPage } from "@/features/locations";
import { PermissionGate } from "@/features/permissions";

export const metadata = { title: "Locations" };

/** Locations – admin/superAdmin only. */
export default function Locations() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <PermissionGate perm="INVENTORY.LOCATIONS.VIEW">
        <LocationsPage />
      </PermissionGate>
    </AuthGuard>
  );
}
