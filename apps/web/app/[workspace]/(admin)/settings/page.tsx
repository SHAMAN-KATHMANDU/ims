import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { SettingsPage } from "@/features/settings";

/** Workspace settings – admin/superAdmin only. */
export default function Settings() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <SettingsPage />
    </AuthGuard>
  );
}
