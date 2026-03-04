import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { LocationsPage } from "@/features/locations";

/** Locations – admin/superAdmin only. */
export default function Locations() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <LocationsPage />
    </AuthGuard>
  );
}
