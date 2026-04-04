import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { EnvFeaturePageGuard, FeaturePageGuard } from "@/features/flags";
import { WorkflowEditorPage } from "@/features/crm";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";

export const metadata = { title: "Deal pipeline rules" };

/** Pipeline workflow automation – admin/superAdmin only, requires Sales Pipeline plan. */
export default function WorkflowsPage() {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.CRM_WORKFLOWS}>
      <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
        <AuthGuard
          roles={["admin", "superAdmin"]}
          unauthorizedPath={WORKSPACE_ROOT}
        >
          <WorkflowEditorPage />
        </AuthGuard>
      </FeaturePageGuard>
    </EnvFeaturePageGuard>
  );
}
