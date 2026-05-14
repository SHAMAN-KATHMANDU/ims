import { AuthGuardWithWorkspace } from "@/components/auth/auth-guard-with-workspace";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { CrmSettingsPage } from "@/features/crm";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

export const metadata = { title: "CRM Settings" };

/** CRM settings – pipelines, sources, journey types, tags – under global Settings. */
export default function SettingsCrmPage() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.CRM_SETTINGS}>
      <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
        <AuthGuardWithWorkspace roles={["admin", "superAdmin"]}>
          <CrmSettingsPage />
        </AuthGuardWithWorkspace>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
