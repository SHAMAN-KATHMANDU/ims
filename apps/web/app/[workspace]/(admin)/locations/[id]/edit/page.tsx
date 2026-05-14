import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { EditLocationPage } from "@/features/locations";

export default function EditLocationRoute() {
  return (
    <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
      <EditLocationPage />
    </AuthGuardWithWorkspace>
  );
}
