import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { PermissionGate } from "@/features/permissions";
import { AiSettingsPage } from "@/features/ai-settings";

export const metadata = { title: "AI Settings" };

export default function Page() {
  return (
    <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
      <PermissionGate perm="SETTINGS.AI.VIEW">
        <AiSettingsPage />
      </PermissionGate>
    </AuthGuardWithWorkspace>
  );
}
