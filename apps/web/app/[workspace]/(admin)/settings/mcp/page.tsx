import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { PermissionGate } from "@/features/permissions";
import { McpSettingsPage } from "@/features/mcp-tokens";

export const metadata = { title: "MCP Settings" };

export default function Page() {
  return (
    <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
      <PermissionGate perm="SETTINGS.MCP.MANAGE">
        <McpSettingsPage />
      </PermissionGate>
    </AuthGuardWithWorkspace>
  );
}
