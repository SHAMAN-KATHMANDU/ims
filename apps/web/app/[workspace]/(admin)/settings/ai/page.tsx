import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { AiSettingsPage } from "@/features/ai-settings";

export const metadata = { title: "AI Settings" };

export default function Page() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <AiSettingsPage />
    </AuthGuard>
  );
}
