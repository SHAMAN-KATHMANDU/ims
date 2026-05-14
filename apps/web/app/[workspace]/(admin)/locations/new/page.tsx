import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { NewLocationPage } from "@/features/locations";

export default function NewLocationRoute() {
  return (
    <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
      <NewLocationPage />
    </AuthGuardWithWorkspace>
  );
}
