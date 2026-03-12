import { AuthGuard } from "@/components/auth/auth-guard";
import { WORKSPACE_ROOT } from "@/constants/routes";
import { FeaturePageGuard } from "@/features/flags";
import { WorkflowEditorPage } from "@/features/crm";
import { Feature } from "@repo/shared";

export const metadata = { title: "Pipeline Workflows" };

/** Pipeline workflow automation – admin/superAdmin only, requires Sales Pipeline plan. */
export default function WorkflowsPage() {
  return (
    <FeaturePageGuard feature={Feature.SALES_PIPELINE}>
      <AuthGuard
        roles={["admin", "superAdmin"]}
        unauthorizedPath={WORKSPACE_ROOT}
      >
        <WorkflowEditorPage />
      </AuthGuard>
    </FeaturePageGuard>
  );
}
