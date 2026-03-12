import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { CrmSettingsPage } from "@/features/crm";
import { Feature } from "@repo/shared";

export const metadata = { title: "CRM Settings" };

/** CRM settings – pipelines, sources, journey types, tags – under global Settings. */
export default function SettingsCrmPage() {
  return (
    <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <CrmSettingsPage />
      </AuthGuard>
    </FeaturePageGuard>
  );
}
