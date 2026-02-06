import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/config/routes";
import { NewLocationPage } from "@/views/locations/NewLocationPage";

export default function NewLocationRoute() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <NewLocationPage />
    </AuthGuard>
  );
}
