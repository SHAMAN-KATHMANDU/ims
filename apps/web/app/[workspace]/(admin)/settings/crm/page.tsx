import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { CrmSettingsPage } from "@/features/crm";

export const metadata = { title: "CRM Settings" };

/** CRM settings – pipelines, sources, journey types, tags – under global Settings. */
export default function SettingsCrmPage() {
  return (
    <AuthGuard
      roles={["admin", "superAdmin"]}
      unauthorizedPath={WORKSPACE_ROOT}
    >
      <CrmSettingsPage />
    </AuthGuard>
  );
}
